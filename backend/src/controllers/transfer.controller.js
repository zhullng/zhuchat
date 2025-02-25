import User from "../models/user.model.js";
import Transfer from "../models/transfer.model.js";

// 🔹 FAZER TRANSFERÊNCIA
// 🔹 FAZER TRANSFERÊNCIA
export const makeTransfer = async (req, res) => {
  const { senderId, receiverEmail, amount } = req.body;

  try {
    if (!senderId || !receiverEmail || !amount || amount <= 0) {
      return res.status(400).json({ error: "Dados inválidos para transferência" });
    }

    const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
    if (!emailRegex.test(receiverEmail)) {
      return res.status(400).json({ error: "Formato de e-mail inválido" });
    }

    const sender = await User.findById(senderId);
    const receiver = await User.findOne({ email: receiverEmail });

    if (!sender || !receiver) {
      return res.status(404).json({ error: "Remetente ou destinatário não encontrado" });
    }

    if (senderId === receiver._id.toString()) {
      return res.status(400).json({ error: "Não é possível transferir para si próprio" });
    }

    if (sender.balance < amount) {
      return res.status(400).json({ error: "Saldo insuficiente" });
    }

    sender.balance -= Number(amount);
    receiver.balance += Number(amount);
    await sender.save();
    await receiver.save();

    const transfer = new Transfer({
      sender: sender._id,
      receiver: receiver._id,
      amount,
      status: "completed",
    });
    await transfer.save();

    res.json({
      message: "Transferência realizada com sucesso!",
      transfer: {
        sender: { fullName: sender.fullName, balance: sender.balance },
        receiver: { fullName: receiver.fullName, balance: receiver.balance },
        amount,
        status: "completed",
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao processar transferência" });
  }
};


// 🔹 HISTÓRICO DE TRANSFERÊNCIAS
export const getTransferHistory = async (req, res) => {
  const { userId } = req.params;

  try {
    if (!userId) return res.status(400).json({ error: "ID do usuário é obrigatório" });

    const transfers = await Transfer.find({
      $or: [{ sender: userId }, { receiver: userId }],
    })
      .populate("sender receiver", "fullName email")
      .sort({ createdAt: -1 });

    res.json(transfers.length > 0 ? transfers : { message: "Nenhuma transferência encontrada" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar histórico de transferências" });
  }
};


export const depositMoney = async (req, res) => {
  const { userId, amount } = req.body;

  try {
    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ error: "Valor inválido para depósito" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

    user.balance += Number(amount); // Garantindo que ambos sejam números

    await user.save();

    res.json({
      message: "Depósito realizado com sucesso!",
      user: { fullName: user.fullName, balance: user.balance },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao processar depósito" });
  }
};

export const withdrawMoney = async (req, res) => {
  const { userId, amount } = req.body;

  try {
    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ error: "Valor inválido para saque" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

    if (user.balance < amount) {
      return res.status(400).json({ error: "Saldo insuficiente" });
    }

    user.balance -= Number(amount); // Garantindo que ambos sejam números

    await user.save();

    res.json({
      message: "Saque realizado com sucesso!",
      user: { fullName: user.fullName, balance: user.balance },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao processar saque" });
  }
};

// 🔹 MOSTRAR SALDO
export const getBalance = async (req, res) => {
  const { userId } = req.params;

  try {
    if (!userId) {
      return res.status(400).json({ error: "ID do usuário é obrigatório" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    res.json({
      message: "Saldo recuperado com sucesso!",
      user: { fullName: user.fullName, balance: user.balance },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao recuperar o saldo" });
  }
};
