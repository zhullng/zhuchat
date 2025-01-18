import { generateToken } from "../lib/utils.js"; // Função para gerar token JWT
import User from "../models/user.model.js";
import bcrypt from "bcryptjs"; 
import cloudinary from "../lib/cloudinary.js"; 

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
    const user = await User.findOne({ email });

    if (user) return res.status(400).json({ message: "Email already exists" });

    // Cria uma pass encriptada
    const salt = await bcrypt.genSalt(10); // Cria o sal (valor único e aleatório)
    const hashedPassword = await bcrypt.hash(password, salt); // Hash à pass

    // Cria um novo user
    const newUser = new User({
      fullName,
      email,
      password: hashedPassword, // Armazena a pass
    });

    if (newUser) {
      // Cria o token JWT e envia na resposta
      generateToken(newUser._id, res);
      await newUser.save(); // Guarda o novo user na bd

      // Recebe os dados do user, exceto a pass
      res.status(201).json({
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        profilePic: newUser.profilePic,
      });
    } else {
      res.status(400).json({ message: "Invalid user data" }); 
    }
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

    // Verifica se a pass está bem
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Cria o token JWT e envia na resposta
    generateToken(user._id, res);

    // Recebe os dados do user, exceto a pass
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
    const { profilePic } = req.body; // Recebe o novo pfp (imagem)
    const userId = req.user._id; // Recebe o ID do user autenticado

    // Verifica se recebeu
    if (!profilePic) {
      return res.status(400).json({ message: "Profile pic is required" });
    }

    // Faz o upload da imagem para o Cloudinary
    const uploadResponse = await cloudinary.uploader.upload(profilePic);
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profilePic: uploadResponse.secure_url }, // Atualiza a URL da imagem de perfil
      { new: true } // Envia o user atualizado
    );

    res.status(200).json(updatedUser);
  } catch (error) {
    console.log("error in update profile:", error);
    res.status(500).json({ message: "Internal server error" });
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
