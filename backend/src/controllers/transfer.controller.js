import User from "../models/user.model.js";
import Transfer from "../models/transfer.model.js";
import { getReceiverSocketId, io } from "../lib/socket.js";

// 🔹 FAZER TRANSFERÊNCIA
// 🔹 FAZER TRANSFERÊNCIA
export const makeTransfer = async (req, res) => {
  const { receiverEmail, amount } = req.body;
  const senderId = req.user._id; // ID do user remetente
  try {
    if (!senderId || !receiverEmail || !amount || amount <= 0) {
      return res.status(400).json({ error: "Dados inválidos para transferência" });
    }

    const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
    if (!emailRegex.test(receiverEmail)) {
      return res.status(400).json({ error: "Formato de e-mail inválido" });
    }

    const sender = await User.findById(senderId);
    const receiver = await User.findOne({ email: receiverEmail }); // Alterado de findById para findOne
    
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

    const transferData = {
      sender: { fullName: sender.fullName, balance: sender.balance },
      receiver: { fullName: receiver.fullName, balance: receiver.balance },
      amount,
      status: "completed",
    };

    // Buscar o socketId do destinatário
    const receiverSocketId = getReceiverSocketId(receiver._id); // Aqui buscamos o socketId

    if (receiverSocketId) {
      // Emitindo o evento com os dados da transferência para o destinatário
      io.to(receiverSocketId).emit("newTransfer", transferData);
    }

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
  const { userId } = req.params; // Obter userId de req.params
  const { receiverEmail } = req.body; // Obter receiverEmail de req.body

  try {
    if (!userId) return res.status(400).json({ error: "ID do usuário é obrigatório" });

    // Buscar o usuário (sender) com base no userId
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

    // Construir o filtro para a busca das transferências
    const filter = {
      $or: [{ sender: userId }, { receiver: userId }],
    };

    // Se o receiverEmail for fornecido, filtra as transferências que envolvem esse email
    if (receiverEmail) {
      filter.$or.push({ receiver: { $in: await User.find({ email: receiverEmail }).select('_id') } });
    }

    // Buscar as transferências com base no filtro
    const transfers = await Transfer.find(filter)
      .populate({
        path: 'sender receiver',
        select: 'fullName email balance', // Selecionando apenas os campos necessários
      })
      .sort({ createdAt: -1 });

    if (transfers.length === 0) {
      return res.status(200).json({ message: "Nenhuma transferência encontrada" });
    }

    // Atualizar os saldos de sender e receiver após cada transferência
    const updatedTransfers = await Promise.all(transfers.map(async (transfer) => {
      let updatedSender = transfer.sender;
      let updatedReceiver = transfer.receiver;

      // Verificar se o sender precisa ser atualizado com os dados mais recentes
      if (updatedSender.email === user.email) {
        updatedSender = await User.findOne({ email: updatedSender.email }).select('fullName email balance');
      }

      // Verificar se o receiver precisa ser atualizado com os dados mais recentes
      if (updatedReceiver.email === user.email) {
        updatedReceiver = await User.findOne({ email: updatedReceiver.email }).select('fullName email balance');
      }

      // Retornar a transferência com os dados atualizados de sender e receiver
      return {
        ...transfer.toObject(),
        sender: updatedSender,
        receiver: updatedReceiver,
      };
    }));

    // Enviar as transferências com os saldos atualizados
    res.json(updatedTransfers);
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
