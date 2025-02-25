import User from "../models/user.model.js";
import Transfer from "../models/transfer.model.js";

// 🔹 FAZER TRANSFERÊNCIA
export const sendTransaction = async (req, res) => {
  try {
    const { receiverEmail, amount } = req.body;
    const senderId = req.user._id;

    if (!receiverEmail || !amount || amount <= 0) {
      return res.status(400).json({ error: "Dados inválidos para a transação" });
    }

    // Buscar destinatário pelo email
    const receiver = await User.findOne({ email: receiverEmail });
    if (!receiver) {
      return res.status(404).json({ error: "Usuário destinatário não encontrado" });
    }

    if (senderId.toString() === receiver._id.toString()) {
      return res.status(400).json({ error: "Não é possível transferir para si mesmo" });
    }

    // Buscar o remetente para verificar saldo
    const sender = await User.findById(senderId);
    if (!sender || sender.balance < amount) {
      return res.status(400).json({ error: "Saldo insuficiente" });
    }

    // Atualizar saldo do remetente e destinatário
    sender.balance -= Number(amount);
    receiver.balance += Number(amount);
    await sender.save();
    await receiver.save();

    // Criar e salvar transação
    const transfer = new Transfer({
      sender: sender._id,
      receiver: receiver._id,
      amount,
      status: "completed",
    });
    await transfer.save();

    res.status(201).json({ message: "Transação realizada com sucesso", transaction: transfer });
  } catch (error) {
    console.error("Erro ao processar transação:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};


export const getTransactionHistoryWithUser = async (req, res) => {
  try {
    const { id: otherUserId } = req.params; // ID do outro usuário na conversa
    const myId = req.user._id; // ID do usuário autenticado

    const transfer = await Transfer.find({
      $or: [
        { senderId: myId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: myId },
      ],
    }).sort({ createdAt: -1 });

    res.status(200).json(transfer);
  } catch (error) {
    console.error("Erro ao buscar histórico de transações:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};


// 🔹 DEPOSITAR DINHEIRO
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


// 🔹 SACAR DINHEIRO
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
