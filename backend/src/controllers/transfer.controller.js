import User from "../models/user.model.js";
import Transfer from "../models/transfer.model.js";

// Função para realizar a transferência
export const makeTransfer = async (req, res) => {
  const { senderId, receiverEmail, amount } = req.body;

  try {
    // Validação de campos obrigatórios
    if (!senderId || !receiverEmail || !amount || amount <= 0) {
      return res.status(400).json({ error: "Dados inválidos para transferência" });
    }

    // Validação do formato do email
    const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
    if (!emailRegex.test(receiverEmail)) {
      return res.status(400).json({ error: "Formato de e-mail inválido" });
    }

    // Busca os dados do remetente e destinatário
    const sender = await User.findById(senderId);
    const receiver = await User.findOne({ email: receiverEmail });

    if (!sender) return res.status(404).json({ error: "Remetente não encontrado" });
    if (!receiver) return res.status(404).json({ error: "Destinatário não encontrado" });

    // Verifica se o remetente tem saldo suficiente
    if (sender.balance < amount) {
      return res.status(400).json({ error: "Saldo insuficiente" });
    }

    // Atualiza os saldos
    sender.balance -= amount;
    receiver.balance += amount;
    await sender.save();
    await receiver.save();

    // Cria a transferência
    const transfer = new Transfer({
      sender: sender._id,
      receiver: receiver._id,
      amount,
      status: "completed",
    });

    await transfer.save();

    // Responde com sucesso
    res.json({ message: "Transferência realizada com sucesso!", senderBalance: sender.balance });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao processar transferência" });
  }
};



/* ========================== 🔹 HISTÓRICO DE TRANSFERÊNCIAS 🔹 ========================== */
export const getTransferHistory = async (req, res) => {
  const { userId } = req.params;

  try {
    const transfers = await Transfer.find({
      $or: [{ sender: userId }, { receiver: userId }],
    })
      .populate("sender receiver", "fullName email")
      .sort({ createdAt: -1 });

    res.json(transfers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erro ao buscar histórico de transações" });
  }
};
