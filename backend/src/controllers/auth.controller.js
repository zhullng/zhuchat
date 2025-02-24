import Stripe from "stripe"; // Importando o Stripe
import { generateToken } from "../lib/utils.js"; // Função para gerar o token JWT
import User from "../models/user.model.js"; // Modelo de usuário
import bcrypt from "bcryptjs"; 
import dotenv from "dotenv"; 

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_API_SECRET); // Inicializando o Stripe

export const signup = async (req, res) => {
  const { fullName, email, password } = req.body; // Recebe os dados da requisição
  try {
    // Verifica se todos os campos foram fornecidos
    if (!fullName || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // Verifica se o e-mail já existe na bd
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: "Email already exists" });

    // Cria uma senha encriptada
    const salt = await bcrypt.genSalt(10); // Cria o sal (valor único e aleatório)
    const hashedPassword = await bcrypt.hash(password, salt); // Hash da senha

    // Verificar se já existe um cliente no Stripe com esse email
    const existingCustomer = await stripe.customers.list({
      email, // Passa o email do usuário para procurar um cliente existente
    });

    let stripeCustomerId;

    if (existingCustomer.data.length > 0) {
      // Cliente já existe no Stripe, usar o ID existente
      stripeCustomerId = existingCustomer.data[0].id;
    } else {
      try {
        // Cliente não existe, criar um novo cliente no Stripe
        const stripeCustomer = await stripe.customers.create({
          email,
          name: fullName,
        });

        stripeCustomerId = stripeCustomer.id;
      } catch (error) {
        console.error("Erro ao criar cliente no Stripe:", error);
        return res.status(500).json({ message: "Erro ao criar cliente no Stripe" });
      }
    }

    // Cria o novo usuário no MongoDB
    const newUser = new User({
      fullName,
      email,
      password: hashedPassword, // Armazena a senha criptografada
      stripeCustomerId, // Armazena o ID do cliente do Stripe
      balance: 0, // Inicializa o saldo como 0
    });

    // Salva o novo usuário na base de dados
    await newUser.save();

    // Cria o token JWT e envia na resposta
    generateToken(newUser._id, res);

    // Responde com os dados do usuário (exceto a senha)
    res.status(201).json({
      _id: newUser._id,
      fullName: newUser.fullName,
      email: newUser.email,
      profilePic: newUser.profilePic,
    });
  } catch (error) {
    console.log("Error in signup controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body; // Recebe os dados de login
  try {
    // Procura na bd
    const user = await User.findOne({ email });

    // Se não existir
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Verifica se a pass está correta
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Cria o token JWT e envia na resposta
    generateToken(user._id, res);

    // Responde com os dados do user, exceto a pass
    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic,
    });
  } catch (error) {
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = (req, res) => {
  try {
    // Limpa o cookie que contém o token JWT
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const updates = req.body;
    const errors = {};

    // Verificar email único
    if (updates.email) {
      const emailExists = await User.findOne({ 
        email: updates.email,
        _id: { $ne: userId }
      });
      if (emailExists) errors.email = "Email já está em uso";
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ errors });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updates,
      { new: true }
    ).select('-password');

    res.status(200).json(updatedUser);
    
  } catch (error) {
    console.log("Erro na atualização do perfil:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

// Função para verificar se o user está autenticado
export const checkAuth = (req, res) => {
  try {
    // Envia as informações do user autenticado
    res.status(200).json(req.user);
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
