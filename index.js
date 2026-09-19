const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(express.json());

// Conexión segura con Supabase usando las variables de entorno de Railway
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Inicializar el bot de Telegram
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Ruta web de verificación para el servidor
app.get('/', (req, res) => {
    res.send('Servidor de Tenddero operando al 100% y conectado con Supabase!');
});

// Usar estrictamente el puerto dinámico que asigna Railway
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo exitosamente en el puerto ${PORT}`);
});

// Manejador de mensajes de Telegram
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const username = msg.from.username || msg.from.first_name || 'Desconocido';

  // Si el usuario escribe /listar, consultamos la base de datos
  if (text === '/listar') {
    try {
      const { data, error } = await supabase
        .from('mensajes_bot')
        .select('*')
        .order('id', { ascending: false })
        .limit(5);

      if (error) throw error;

      if (!data || data.length === 0) {
        return bot.sendMessage(chatId, '📭 Aún no hay registros guardados en Supabase.');
      }

      let respuesta = '📋 **Últimos registros en Supabase:**\n\n';
      data.forEach((item, index) => {
        respuesta += `${index + 1}. *${item.usuario}*: "${item.mensaje}"\n`;
      });

      bot.sendMessage(chatId, respuesta, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error(err);
      bot.sendMessage(chatId, '❌ Error al consultar la base de datos.');
    }
    return;
  }

  // Para cualquier otro mensaje, lo guardamos en Supabase
  try {
    const { error } = await supabase
      .from('mensajes_bot')
      .insert([{ usuario: username, mensaje: text }]);

    if (error) {
      console.error('Error al guardar en Supabase:', error);
      bot.sendMessage(chatId, `¡Hola, ${username}! Recibí tu mensaje, pero hubo un error al guardarlo en la BD.`);
    } else {
      bot.sendMessage(chatId, `✅ ¡Mensaje guardado con éxito en Supabase, ${username}!: "${text}"`);
    }
  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, `¡Hola, ${username}! Recibí tu mensaje: "${text}".`);
  }
});
