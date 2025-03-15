import { generateToken } from "../lib/utils.js"; // Função para gerar token JWT
import User from "../models/user.model.js";
import bcrypt from "bcryptjs"; 
import Stripe from "stripe"; // Importando o Stripe
import dotenv from "dotenv"; 

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_API_SECRET); 


export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    // Verificar se o usuário existe
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    // Verificar se a senha atual está correta
    const isPasswordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordMatch) {
      return res.status(400).json({ message: "Senha atual incorreta" });
    }

    // Atualizar a senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Senha atualizada com sucesso" });
  } catch (error) {
    console.error("Password update error:", error);
    res.status(500).json({ message: "Erro ao atualizar senha" });
  }
};

export const signup = async (req, res) => {
  const { fullName, gender, email, password } = req.body;

  try {
    // Verifica se todos os campos foram fornecidos
    if (!fullName || !gender || !email || !password) {
      return res.status(422).json({ message: "All fields are required" });
    }

    if (password.length < 6) {
      return res.status(422).json({ message: "Password must be at least 6 characters" });
    }

    // Verifica se o e-mail já existe na BD
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(409).json({ message: "Email already exists" }); // 409 = Conflict
    }

    // Cria e encripta a senha
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const existingCustomer = await stripe.customers.list({
      email, // Passa o email do user para procurar um cliente existente
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

    // Cria o novo user
    const newUser = new User({
      fullName,
      gender,
      email,
      password: hashedPassword,
      stripeCustomerId, // 🔹 Adiciona o ID do Stripe ao user
    });
    
    await newUser.save();

    // Cria o token JWT e envia na resposta
    generateToken(newUser._id, res);

    res.status(201).json({
      _id: newUser._id,
      fullName: newUser.fullName,
      email: newUser.email,
      profilePic: newUser.profilePic || "", // Evita erro se profilePic for undefined
      gender: newUser.gender,
      stripeCustomerId: newUser.stripeCustomerId,
    });

  } catch (error) {
    console.error("Error in signup controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  const { email, password } = req.body;
  
  try {
    // 🔹 1. Verifica se o user existe
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 🔹 2. Verifica se a senha está correta
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 🔹 3. Verifica se já tem um stripeCustomerId
    let stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      try {
        // 🔹 4. Criar um cliente no Stripe, já que não tem ID
        const stripeCustomer = await stripe.customers.create({
          email: user.email,
          name: user.fullName,
        });

        stripeCustomerId = stripeCustomer.id;

        // 🔹 5. Atualizar o user no banco com o stripeCustomerId gerado
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

    // 🔹 6. Gera o token JWT e faz login normalmente
    generateToken(user._id, res);

    res.status(200).json({
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      profilePic: user.profilePic || "",
      stripeCustomerId: user.stripeCustomerId, // 🔹 Retorna sempre o ID atualizado
    });

  } catch (error) {
    console.error("Error in login controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Error in logout controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const updates = req.body;
    const errors = {};

    console.log("Atualizando perfil - Dados recebidos:", updates);

    // Validação dos campos
    if (updates.fullName !== undefined) {
      if (!updates.fullName.trim()) {
        errors.fullName = "Nome é obrigatório";
      } else if (updates.fullName.trim().length < 3) {
        errors.fullName = "Nome deve ter no mínimo 3 caracteres";
      } else {
        // Verifica se o nome já está em uso por outro usuário
        const nameExists = await User.findOne({
          fullName: updates.fullName.trim(),
          _id: { $ne: userId }
        });
        if (nameExists) {
          errors.fullName = "Este nome já está em uso";
        }
      }
    }

    if (updates.email !== undefined) {
      if (!updates.email.trim()) {
        errors.email = "Email é obrigatório";
      } else if (!/\S+@\S+\.\S+/.test(updates.email)) {
        errors.email = "Formato de email inválido";
      } else {
        // Verifica se o email já está em uso
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
      if (updates.gender && !["male", "female"].includes(updates.gender)) {
        errors.gender = "Gênero inválido";
      }
    }

    // Impede atualização de campos não permitidos
    const allowedUpdates = ['fullName', 'email', 'gender', 'profilePic'];
    const receivedUpdates = Object.keys(updates);
    const invalidUpdates = receivedUpdates.filter(key => !allowedUpdates.includes(key));

    if (invalidUpdates.length > 0) {
      console.log("Tentativa de atualização de campos não permitidos:", invalidUpdates);
      return res.status(400).json({ 
        message: `Campos não permitidos: ${invalidUpdates.join(', ')}` 
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
          if (trimmedValue !== '') {
            acc[key] = key === 'email' ? trimmedValue.toLowerCase() : trimmedValue;
          }
        } else {
          acc[key] = value;
        }
      }
      return acc;
    }, {});

    console.log("Dados limpos para atualização:", cleanUpdates);

    if (Object.keys(cleanUpdates).length === 0) {
      return res.status(400).json({ message: "Nenhum dado válido para atualização" });
    }

    // Atualiza os dados do User
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
      console.log("User não encontrado para atualização:", userId);
      return res.status(404).json({ message: "User não encontrado" });
    }

    console.log("Perfil atualizado com sucesso:", updatedUser);
    res.status(200).json(updatedUser);

  } catch (error) {
    console.error("Erro na atualização do perfil:", error);
    res.status(500).json({ 
      message: "Erro ao atualizar perfil",
      error: error.message 
    });
  }
};

// Verifica se o user está autenticado
export const checkAuth = (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.error("Error in checkAuth controller:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
