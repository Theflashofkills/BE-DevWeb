const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Usuario = require('./models/user');
const Tarefa = require('./models/task');
const authMiddleware = require('./middlewares/auth');

const app = express();
app.use(express.json());

const PORTA = process.env.PORT || 3000;
const URI_MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/devweb';
const CHAVE_SECRETA = process.env.SECRET_KEY || 'your-secret-key';

mongoose.connect(URI_MONGO, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB conectado'))
  .catch(err => console.error(err));

app.post('/login', async (req, res) => {
  const { email, senha } = req.body;
  try {
    const usuario = await Usuario.findOne({ email });
    if (!usuario || !await bcrypt.compare(senha, usuario.senha)) {
      return res.status(401).send('Credenciais inválidas');
    }
    const token = jwt.sign({ id: usuario._id }, CHAVE_SECRETA, { expiresIn: '1d' });
    res.json({ token });
  } catch (error) {
    res.status(500).send('Erro no servidor');
  }
});

app.post('/registro', async (req, res) => {
  const { nome, email, senha, funcao } = req.body;
  try {
    const senhaHashed = await bcrypt.hash(senha, 10);
    const usuario = new Usuario({ nome, email, senha: senhaHashed, funcao });
    await usuario.save();
    res.status(201).send('Usuário registrado com sucesso');
  } catch (error) {
    res.status(400).send(error.message);
  }
});

app.get('/usuarios', authMiddleware, async (req, res) => {
  try {
    const usuarios = await Usuario.find();
    res.json(usuarios);
  } catch (error) {
    res.status(500).send('Erro no servidor');
  }
});

app.put('/usuarios/:id', authMiddleware, async (req, res) => {
  const { nome, email, funcao } = req.body;
  try {
    const usuario = await Usuario.findById(req.params.id);
    if (!usuario) {
      return res.status(404).send('Usuário não encontrado');
    }
    usuario.nome = nome;
    usuario.email = email;
    usuario.funcao = funcao;
    await usuario.save();
    res.send('Usuário atualizado com sucesso');
  } catch (error) {
    res.status(500).send('Erro no servidor');
  }
});

app.post('/usuarios', authMiddleware, async (req, res) => {
  const { nome, email, senha, funcao } = req.body;
  try {
    const senhaHashed = await bcrypt.hash(senha, 10);
    const usuario = new Usuario({ nome, email, senha: senhaHashed, funcao });
    await usuario.save();
    res.status(201).send('Usuário criado com sucesso');
  } catch (error) {
    res.status(400).send(error.message);
  }
});

app.delete('/usuarios/:id', authMiddleware, async (req, res) => {
  try {
    await Usuario.findByIdAndDelete(req.params.id);
    res.send('Usuário deletado com sucesso');
  } catch (error) {
    res.status(500).send('Erro no servidor');
  }
});

app.get('/usuarios/contagem', authMiddleware, async (req, res) => {
  try {
    const contagem = await Usuario.aggregate([
      { $group: { _id: '$funcao', count: { $sum: 1 } } }
    ]);
    res.json(contagem);
  } catch (error) {
    res.status(500).send('Erro no servidor');
  }
});

app.get('/tarefas', authMiddleware, async (req, res) => {
  try {
    const tarefas = await Tarefa.find({ usuario: req.user.id });
    res.json(tarefas);
  } catch (error) {
    res.status(500).send('Erro no servidor');
  }
});

app.put('/tarefas/:id', authMiddleware, async (req, res) => {
  const { descricao, concluida } = req.body;
  try {
    const tarefa = await Tarefa.findOne({ _id: req.params.id, usuario: req.user.id });
    if (!tarefa) {
      return res.status(404).send('Tarefa não encontrada');
    }
    tarefa.descricao = descricao !== undefined ? descricao : tarefa.descricao;
    tarefa.concluida = concluida !== undefined ? concluida : tarefa.concluida;
    await tarefa.save();
    res.send('Tarefa atualizada com sucesso');
  } catch (error) {
    res.status(500).send('Erro no servidor');
  }
});

app.post('/tarefas', authMiddleware, async (req, res) => {
  const { titulo, descricao } = req.body;
  try {
    const tarefa = new Tarefa({
      usuario: req.user.id,
      titulo,
      descricao
    });
    await tarefa.save();
    res.status(201).json(tarefa);
  } catch (error) {
    res.status(400).send(error.message);
  }
});

app.delete('/tarefas/:id', authMiddleware, async (req, res) => {
  const idTarefa = req.params.id;
  try {
    const tarefa = await Tarefa.findOneAndDelete({ _id: idTarefa, usuario: req.user.id });
    if (!tarefa) {
      return res.status(404).send('Tarefa não encontrada');
    }
    res.send('Tarefa deletada com sucesso');
  } catch (error) {
    res.status(400).send(error.message);
  }
});

app.get('/tarefas/sem-usuario', authMiddleware, async (req, res) => {
  try {
    const tarefas = await Tarefa.find({ usuario: null });
    res.json(tarefas);
  } catch (error) {
    res.status(500).send('Erro ao buscar tarefas sem dono');
  }
});

app.put('/tarefas/:id/atribuir', authMiddleware, async (req, res) => {
  const idTarefa = req.params.id;
  const idUsuario = req.user.id;

  try {
    const tarefa = await Tarefa.findById(idTarefa);
    if (!tarefa) {
      return res.status(404).send('Tarefa não encontrada');
    }
    tarefa.usuario = idUsuario;
    await tarefa.save();
    res.send('Dono atribuído à tarefa com sucesso');
  } catch (error) {
    res.status(500).send('Erro ao atribuir dono à tarefa');
  }
});

app.listen(PORTA, () => {
  console.log(`Servidor rodando em http://localhost:${PORTA}`);
});
