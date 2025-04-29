import { generateToken } from "../lib/utils.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs"; 
import Stripe from "stripe";
import dotenv from "dotenv"; 

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_API_SECRET); 


export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    // Verificar se o utilizador existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilizador não foi encontrado" });
    }

    // Verificar se a password atual está correta
    const isPasswordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordMatch) {
      return res.status(400).json({ message: "Palavra-passe atual incorreta" });
    }

    // Atualizar a password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Palavra-passe atualizada com sucesso" });
  } catch (error) {
    console.error("Erro ao atualizar palavra-passe:", error);
    res.status(500).json({ message: "Erro ao atualizar palavra-passe" });
  }
};

export const signup = async (req, res) => {
  const { fullName, gender, email, password, profilePic } = req.body;

  try {
    // Verifica se todos os campos obrigatórios foram fornecidos
    if (!fullName || !gender || !email || !password) {
      return res.status(422).json({ message: "Todos os campos são obrigatórios" });
    }

    if (password.length < 6) {
      return res.status(422).json({ message: "Palavra-passe deve ter pelo menos 6 caracteres" });
    }

    // Verifica se o e-mail já existe na BD
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(409).json({ message: "Este email já está registado" });
    }

    // Cria e encripta a password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const existingCustomer = await stripe.customers.list({
      email,
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

    // Preparar objeto do user
    const userData = {
      fullName,
      gender,
      email,
      password: hashedPassword,
      stripeCustomerId,
    };

    // Adicionar a foto de perfil se fornecida
    if (profilePic) {
      userData.profilePic = profilePic;
    }

    // Cria o novo utilizador com todos os dados
    const newUser = new User(userData);
    
    await newUser.save();

    // Cria o token JWT e envia na resposta
    generateToken(newUser._id, res);

    res.status(201).json({
      _id: newUser._id,
      fullName: newUser.fullName,
      email: newUser.email,
      profilePic: newUser.profilePic || "",
      gender: newUser.gender,
      stripeCustomerId: newUser.stripeCustomerId,
    });

  } catch (error) {
    console.error("Erro no controlador de registo:", error.message);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // Verifica se o utilizador existe
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Credenciais inválidas" });
    }

    // Verifica se a palavra-passe está correta
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: "Credenciais inválidas" });
    }

    // Verifica se já tem um stripeCustomerId
    let stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      try {
        // Criar um cliente no Stripe, já que não tem ID
        const stripeCustomer = await stripe.customers.create({
          email: user.email,
          name: user.fullName,
        });

        stripeCustomerId = stripeCustomer.id;

        // Atualizar o utilizador na BD com o stripeCustomerId gerado
        user = await User.findByIdAndUpdate(
          user._id,
          { stripeCustomerId },
          { new: true } // Retorna os dados atualizados
        );
      } catch (error) {
        console.error("Erro ao criar cliente no Stripe:", error);
        return res.status(500).json({ message: "Erro ao criar cliente no Stripe" });
      }
    }

    // Cria o token JWT e faz login normalmente
    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic || "",
      gender: user.gender,
      stripeCustomerId: user.stripeCustomerId,
    });

  } catch (error) {
    console.error("Erro no controlador de login:", error.message);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};


export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Sessão terminada com sucesso" });
  } catch (error) {
    console.error("Erro no controlador de logout:", error.message);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const updates = req.body;
    const errors = {};

    console.log("A atualizar perfil - Dados recebidos:", updates);

    // Validação dos campos
    if (updates.fullName !== undefined) {
      if (!updates.fullName.trim()) {
        errors.fullName = "Nome é obrigatório";
      } else if (updates.fullName.trim().length < 3) {
        errors.fullName = "Nome deve ter no mínimo 3 caracteres";
      }
    }

    if (updates.email !== undefined) {
      if (!updates.email.trim()) {
        errors.email = "Email é obrigatório";
      } else if (!/\S+@\S+\.\S+/.test(updates.email)) {
        errors.email = "Formato de email inválido";
      } else {
        // Verifica se o email já está em uso por outro utilizador
        const emailExists = await User.findOne({
          email: updates.email.trim().toLowerCase(),
          _id: { $ne: userId }
        });
        
        if (emailExists) {
          errors.email = "Email já está em uso";
        }
      }
    }

    if (updates.gender !== undefined) {
      if (updates.gender && !["male", "female", ""].includes(updates.gender)) {
        errors.gender = "Género inválido";
      }
    }

    // Impede atualização de campos não permitidos
    const allowedUpdates = ['fullName', 'email', 'gender', 'profilePic'];
    const receivedUpdates = Object.keys(updates);
    const invalidUpdates = receivedUpdates.filter(key => !allowedUpdates.includes(key));

    if (invalidUpdates.length > 0) {
      console.log("Tentativa de atualização de campos não permitidos:", invalidUpdates);
      return res.status(400).json({ 
        message: `Campos não permitidos: ${invalidUpdates.join(', ')}`,
        errors: { general: `Campos não permitidos: ${invalidUpdates.join(', ')}` }
      });
    }

    // Retorna erros de validação se houver
    if (Object.keys(errors).length > 0) {
      console.log("Erros de validação:", errors);
      return res.status(400).json({ errors });
    }

    // Limpa e prepara os dados para atualização
    const cleanUpdates = Object.entries(updates).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null) {
        if (typeof value === 'string') {
          const trimmedValue = value.trim();
          if (key === 'email') {
            acc[key] = trimmedValue.toLowerCase();
          } else {
            acc[key] = trimmedValue;
          }
        } else {
          acc[key] = value;
        }
      }
      return acc;
    }, {});

    console.log("Dados limpos para atualização:", cleanUpdates);

    if (Object.keys(cleanUpdates).length === 0) {
      return res.status(400).json({ 
        message: "Nenhum dado válido para atualização",
        errors: { general: "Nenhum dado válido para atualização" }
      });
    }

    // Atualiza os dados do utilizador
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: cleanUpdates }, 
      { 
        new: true, 
        runValidators: true,
        select: '-password'
      }
    );

    if (!updatedUser) {
      console.log("Utilizador não encontrado para atualização:", userId);
      return res.status(404).json({ 
        message: "Utilizador não encontrado",
        errors: { general: "Utilizador não encontrado" }
      });
    }

    console.log("Perfil atualizado com sucesso:", updatedUser);
    
    // Retornar os dados atualizados e uma mensagem de sucesso
    res.status(200).json({
      ...updatedUser.toObject(),
      message: "Perfil atualizado com sucesso"
    });

  } catch (error) {
    console.error("Erro na atualização do perfil:", error);
    
    // Verificar se é um erro de duplicação do MongoDB (código 11000)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const errorMessage = `${field === 'email' ? 'Email' : 'Campo'} já está em uso`;
      
      return res.status(400).json({ 
        message: errorMessage,
        errors: { [field]: errorMessage }
      });
    }
    
    res.status(500).json({ 
      message: "Erro ao atualizar perfil",
      error: error.message,
      errors: { general: "Erro ao atualizar perfil" }
    });
  }
};

// Verifica se o utilizador está autenticado
export const checkAuth = (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.error("Erro no controlador de verificação de autenticação:", error.message);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};