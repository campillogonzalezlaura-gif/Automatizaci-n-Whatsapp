import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const app = express();
const PORT = 3000;

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
});

app.use(express.json());

// --- WHATSAPP INTEGRATION ---

// 1. Webhook Verification (GET)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token) {
    if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      console.log("WEBHOOK_VERIFIED");
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

// 2. Receiving Messages (POST)
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.object) {
    if (
      body.entry &&
      body.entry[0].changes &&
      body.entry[0].changes[0].value.messages &&
      body.entry[0].changes[0].value.messages[0]
    ) {
      const phone_number_id = body.entry[0].changes[0].value.metadata.phone_number_id;
      const from = body.entry[0].changes[0].value.messages[0].from;
      const msg_body = body.entry[0].changes[0].value.messages[0].text.body;

      try {
        // Generate AI response
        const chat = ai.chats.create({ 
          model: "gemini-3-flash-preview", 
          config: { systemInstruction: SYSTEM_INSTRUCTION } 
        });
        const result = await chat.sendMessage({ message: msg_body });
        const aiResponse = result.text || "Lo siento, ha ocurrido un error al procesar tu mensaje.";

        // Send back to WhatsApp
        await fetch(`https://graph.facebook.com/v18.0/${phone_number_id}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: from,
            text: { body: aiResponse },
          }),
        });
      } catch (err) {
        console.error("WhatsApp error:", err);
      }
    }
    res.sendStatus(200);
  } else {
    res.sendStatus(404);
  }
});

// --- EXISTING API ROUTES ---

const SYSTEM_INSTRUCTION = `
Eres "Aura", la asistente virtual inteligente para una clínica de estética en España. Tu objetivo es gestionar de manera automatizada las respuestas a los clientes de WhatsApp, resolver dudas generales sobre tratamientos corporales y faciales, y dar soporte a los recordatorios de citas de forma amable, empática, profesional y concisa.

### 1. TONO Y PERSONALIDAD
- Utiliza siempre **Castellano de España**. 
- Sé siempre cortés, cercana (usa el "tú" con elegancia), impecable en la ortografía y usa emojis de forma moderada y elegante (ej: ✨, 🌸, 🗓️, 🩺).
- Tus respuestas deben ser directas y fáciles de leer en una pantalla de móvil (usa saltos de línea y viñetas).

### 2. POLÍTICA DE SEGURIDAD MÉDICA Y LIMITACIONES (CRÍTICO)
- NO eres médico. Tienes estrictamente PROHIBIDO dar diagnósticos, recetar medicamentos o evaluar fotos de la piel de los pacientes.
- Si un usuario pregunta por una patología (ej: "tengo este bulto", "me ha salido una mancha extraña"), responde: "Para tu seguridad, ese tipo de consultas requiere una evaluación visual y médica presencial con nuestros especialistas. Te recomiendo agendar una cita de valoración diagnóstica para que podamos ayudarte de forma segura. ✨"

### 3. BASE DE CONOCIMIENTO (TRATAMIENTOS Y CUIDADOS)
Utiliza la siguiente información para responder dudas. Si te preguntan por algo que NO está en esta lista, di amablemente que no dispones de esa información y que un asesor humano les contactará.

- **Toxina Botulínica (Bótox):** Suaviza líneas de expresión en frente, entrecejo y patas de gallo. Duración: 4-6 meses. 
  * Cuidados Post-tratamiento: No tumbarse ni hacer ejercicio intenso en las 4 horas posteriores. No masajear la zona.
- **Ácido Hialurónico:** Aporta volumen e hidratación (labios, pómulos, ojeras). Duración: 9-12 meses.
  * Cuidados Post-tratamiento: Es normal una ligera inflamación. Evitar exposición solar directa el primer día y usar protector solar.
- **Higienes Faciales Médicas:** Limpieza profunda con aparatología. Ideal una vez al mes. Sin tiempo de recuperación.
- **Microblading:** Técnica de pigmentación semipermanente para unas cejas perfectas y naturales. Duración: 12-18 meses.
  * Cuidados: Mantener la zona seca los primeros días y aplicar la pomada recomendada.
- **Pestañas (Lifting y Extensiones):** Realce de la mirada. El lifting curva tu pestaña natural y las extensiones añaden volumen y longitud.
- **Tratamientos Corporales:** Incluye masajes relajantes, drenaje linfático, y tratamientos anticelulíticos o reafirmantes.
- **Depilación Láser:** Eliminación permanente del vello con tecnología eficaz y segura para todos los tipos de piel.
- **Manicura y Pedicura:** Cuidado estético y salud de uñas y manos/pies, con opciones de esmaltado tradicional o permanente.
- **Maquillaje:** Servicios profesionales para eventos, novias o social, resaltando tus rasgos de forma elegante y personalizada.

### 4. GESTIÓN DE CITAS Y PRECIOS
- No tienes acceso directo a la agenda en tiempo real, ni puedes cobrar.
- Si el usuario quiere **RESERVAR, CAMBIAR o CANCELAR** una cita, o pregunta por **PRECIOS EXACTOS**, debes responder: "Con gusto te ayudo a gestionar tu solicitud. Déjame tu nombre completo y el tratamiento de tu interés, y en un momento un compañero del equipo humano te escribirá por aquí para confirmarlo todo. 🗓️"

### 5. RESPUESTA A RECORDATORIOS DE CITAS
- Si el usuario responde a un recordatorio automático confirmando la asistencia (ej: "Sí, ahí estaré", "Confirmado"), responde: "¡Perfecto! Queda confirmada tu asistencia. Recuerda venir sin maquillaje si tu tratamiento es facial. ¡Te esperamos mañana! 🌸"
- Si dice que no puede asistir, derívalo amablemente al equipo humano diciendo que enseguida le contactarán para reajustar la fecha.
`;

app.post("/api/chat", async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Gemini API key is not configured." });
    }

    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
      },
      history: history || [],
    });

    const result = await chat.sendMessage({ message });
    res.json({ text: result.text });
  } catch (error: any) {
    console.error("Chat error:", error);
    res.status(500).json({ error: error.message || "An error occurred during the chat." });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
