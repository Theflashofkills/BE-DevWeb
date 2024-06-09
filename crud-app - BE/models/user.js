const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['Engenheiro de FE', 'Engenheiro de BE', 'Analista de dados', 'Líder Técnico'], required: true }
});

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 8);
  next();
});

module.exports = mongoose.model('User', UserSchema);
