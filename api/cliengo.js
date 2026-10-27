/**
 * Webhook Serverless: Integración Cliengo Chatbot ⇄ Kommo CRM
 * Desplegable en Vercel Serverless Functions
 */

const KOMMO_SUBDOMAIN = process.env.KOMMO_SUBDOMAIN || 'casasriscos';
const KOMMO_TOKEN = process.env.KOMMO_TOKEN || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjljNTllYTQwYzVhNWQ1OTFjNTU1NjM0NWNmZDkzY2QzOTg4NTM0ZjYyNWI3NWEzMmMyMTkxN2NlNTU3NzY1MjFlNzdlYmNjMzg3MGEzNzZmIn0.eyJhdWQiOiIwNzMyNzIxMi1jOTBjLTQxMTgtYTk4Yi0wMmZmMWI3YmUzODQiLCJqdGkiOiI5YzU5ZWE0MGM1YTVkNTkxYzU1NTYzNDVjZmQ5M2NkMzk4ODUzNGY2MjViNzVhMzJjMjE5MTdjZTU1Nzc2NTIxZTc3ZWJjYzM4NzBhMzc2ZiIsImlhdCI6MTc5MDYxODU2NiwibmJmIjoxNzkwNjE4NTY2LCJleHAiOjE5MjQ5MDU2MDAsInN1YiI6IjczMDYxNjkiLCJncmFudF90eXBlIjoiIiwiYWNjb3VudF9pZCI6MzY0ODM5NjMsImJhc2VfZG9tYWluIjoia29tbW8uY29tIiwidmVyc2lvbiI6Miwic2NvcGVzIjpbImNybSIsImZpbGVzIiwiZmlsZXNfZGVsZXRlIiwibGlzdF9leHRlcm5hbF9tZXNzYWdlcyIsIm5vdGlmaWNhdGlvbnMiLCJwdXNoX25vdGlmaWNhdGlvbnMiLCJzZW5kX2V4dGVybmFsX21lc3NhZ2VzIiwidXNlcnNfYWN0aXZhdGUiLCJ1c2Vyc19hZGQiLCJ1c2Vyc19kZWFjdGl2YXRlIl0sImhhc2hfdXVpZCI6IjZkNThiNmI2LWQ5NmQtNDQwYy1iODIzLWY4NWVjMDM4ZDA3ZSIsImFwaV9kb21haW4iOiJhcGktZy5rb21tby5jb20ifQ.PhDQRJxM7x41nHyXC8kSAytjfErWROMfTjSMLqYjawudAm9huM6g59gL6OWbA1lmWUvFjxiWwZQ5KiLoKdtBj64JFxKJYPSFTQa_a_AGVWwjS8ih5oYh-PVN2wTsPiIgvhaTnTfAoy2U7F1J8MqAKXKUMf_h-C2tQeyKzMR6YuQbBvTSXdYSXnv3S5-b0IoPg0sycg5I3qTawqiHkveN1_jM4Woe4YsV0C96PK8tmy_rUDJOo5iunvYzh-LWfPTP2ZvmdWHPRV4OavOgfaBz20DM9hZpL-GVLF3fmjkuhla3bFKnuQYfvLr48SSDpEBOcoCbk-8ACPQwlHeuNh3Q7g';
const CLIENGO_API_KEY = process.env.CLIENGO_API_KEY || 'df73b0e5-8b20-40e1-8f60-f102b9f332a3';

// Pipeline y Etapa en Kommo: "Secuencia de Venta" -> "Contacto inicial" (primera etapa de recepción)
const PIPELINE_ID = 13749307;
const STATUS_ID = 106080223;

// Mapeo oficial de Sitios Web de Cliengo a Desarrollos de Casas Riscos
const WEBSITES_MAP = {
  '613912a66afb17002a308cca': 'INTERCITY I',
  '63581e3e0a76c5002a83885d': 'CASAS RISCOS',
  '63b83243b491de002a785bde': 'CONDESA',
  '6aa1caffb8521d798e61ab6a': 'LANTANA',
  '6ab30d7ceba920601f7a826b': 'VISTA ALTA',
  '6ab440643eb6076443a4c9a6': 'CASAS RISCOS',
  '6ab553ff08e70848b8bf5924': 'MIRADOR',
  '6ab5559c0e8d1d779edaeecc': 'GRAND CUMBRE MIRADOR'
};

// Catálogo oficial de enums en Kommo CRM para el campo Desarrollo de Interés (2452621)
const KOMMO_DEVELOPMENTS = {
  'CONDESA': { enum_id: 1850179, value: 'CONDESA' },
  'CONDESA II': { enum_id: 1850181, value: 'CONDESA II' },
  'CONDESA III': { enum_id: 1850183, value: 'CONDESA III' },
  'ALPES': { enum_id: 1850185, value: 'ALPES' },
  'ALPES II': { enum_id: 1850187, value: 'ALPES II' },
  'ADAGIO I': { enum_id: 1850189, value: 'ADAGIO I' },
  'ALLEGRO III': { enum_id: 1850191, value: 'ALLEGRO III' },
  'INTERCITY I': { enum_id: 1850193, value: 'INTERCITY I' },
  'INTERCITY II': { enum_id: 1850195, value: 'INTERCITY II' },
  'MIRADOR': { enum_id: 1850197, value: 'MIRADOR' },
  'MIRADOR II': { enum_id: 1850199, value: 'MIRADOR II' },
  'GRAND CUMBRE MIRADOR': { enum_id: 1850201, value: 'GRAND CUMBRE MIRADOR' },
  'VISTA ALTA': { enum_id: 1857335, value: 'VISTA ALTA' },
  'LANTANA': { enum_id: 1858809, value: 'Lantana' },
  'CASAS RISCOS': { enum_id: 1864217, value: 'CASAS RISCOS' }
};

// Cache de debounce para evitar duplicados en ráfaga (mismo contacto procesado en < 30s)
const recentlyProcessed = new Map();

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Healthcheck y soporte de prueba de conexión desde panel de Cliengo
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      service: 'Cliengo ⇄ Kommo CRM Integration',
      timestamp: new Date().toISOString()
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = req.body || {};
    console.log('Webhook Cliengo recibido:', JSON.stringify(body));

    // Si es un test de conexión de Cliengo (ping de prueba)
    if (body.test === true || body.event === 'ping' || body.type === 'ping' || Object.keys(body).length === 0) {
      return res.status(200).json({
        status: 'ok',
        message: 'Conexión probada exitosamente con el Webhook de Cliengo.'
      });
    }

    // Extraer datos del contacto de Cliengo (soporta tanto formato Connect API como Webhook clásico)
    const contactData = extractContactFromCliengo(body);

    if (!contactData || (!contactData.name && !contactData.phone && !contactData.email)) {
      return res.status(200).json({
        status: 'ignored',
        message: 'No se encontraron datos mínimos de contacto en el payload.',
        receivedBody: body
      });
    }

    // Debounce por teléfono o email
    const dedupeKey = (contactData.phone || contactData.email || contactData.id || '').toLowerCase();
    if (dedupeKey) {
      const now = Date.now();
      const last = recentlyProcessed.get(dedupeKey);
      if (last && (now - last) < 30000) {
        console.log(`Contacto ${dedupeKey} procesado hace menos de 30s. Ignorando.`);
        return res.status(200).json({ status: 'ignored', reason: 'debounce_duplicate' });
      }
      recentlyProcessed.set(dedupeKey, now);
    }

    // Procesar creación / actualización en Kommo
    const result = await processCliengoLead(contactData);

    return res.status(200).json({
      status: 'ok',
      result
    });

  } catch (err) {
    console.error('Error procesando webhook de Cliengo:', err);
    return res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

/**
 * Normaliza y extrae los datos de contacto sin importar la variante del payload de Cliengo
 */
function extractContactFromCliengo(body) {
  const data = body.data || body.contact || body;

  const id = data.id || body.contactId || body.id || '';
  const name = (data.name || body.name || '').trim();
  const lastName = (data.lastName || body.lastName || '').trim();
  const fullName = [name, lastName].filter(Boolean).join(' ') || name || 'Lead Cliengo';

  let rawPhone = data.phone || data.internationalPhoneNumber || data.whatsappPhoneNumber || body.phone || '';
  let cleanPhone = String(rawPhone).replace(/[^\d+]/g, '');

  let rawEmail = data.email || body.email || '';
  let cleanEmail = '';
  const emailMatch = String(rawEmail).match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    cleanEmail = emailMatch[0].toLowerCase();
  }

  // Transcripción del chat
  const chatMessage = data.message || body.message || data.chatLog || '';

  // Identificador de sitio web para detectar desarrollo inmobiliario
  const websiteId = data.websiteId || body.websiteId || data.customParams?.ldkWebsiteId || '';
  const websiteUrl = data.conversionUrl || data.url || body.websiteUrl || '';

  return {
    id,
    name: fullName,
    phone: cleanPhone,
    email: cleanEmail,
    message: chatMessage,
    websiteId,
    websiteUrl,
    raw: data
  };
}

/**
 * Crea o asocia el Lead y Contacto en Kommo CRM
 */
async function processCliengoLead(contact) {
  // 1. Determinar el Desarrollo Inmobiliario
  let devInteres = WEBSITES_MAP[contact.websiteId] || '';

  if (!devInteres && contact.message) {
    const msgLower = contact.message.toLowerCase();
    if (msgLower.includes('lantana')) devInteres = 'LANTANA';
    else if (msgLower.includes('vista alta')) devInteres = 'VISTA ALTA';
    else if (msgLower.includes('condesa')) devInteres = 'CONDESA';
    else if (msgLower.includes('alpes')) devInteres = 'ALPES';
    else if (msgLower.includes('intercity')) devInteres = 'INTERCITY I';
    else if (msgLower.includes('mirador')) devInteres = 'MIRADOR';
    else if (msgLower.includes('cumbre')) devInteres = 'GRAND CUMBRE MIRADOR';
  }

  if (!devInteres) {
    devInteres = 'CASAS RISCOS';
  }

  console.log(`Procesando prospecto Cliengo: ${contact.name} | Tel: ${contact.phone} | Dev: ${devInteres}`);

  // 2. Buscar si el contacto ya existe en Kommo para no duplicarlo
  let existingContactId = null;
  if (contact.phone) {
    const searchPhone = contact.phone.slice(-10); // últimos 10 dígitos
    existingContactId = await findContactInKommo(searchPhone);
  }
  if (!existingContactId && contact.email) {
    existingContactId = await findContactInKommo(contact.email);
  }

  // 3. Crear o actualizar contacto en Kommo
  let contactId = existingContactId;
  if (!contactId) {
    contactId = await createContactInKommo(contact);
  }

  // 4. Preparar Etiquetas: "Cliengo-<Proyecto>", "NO Bots" y "Página Web"
  const tags = [
    { name: `Cliengo-${devInteres}` },
    { name: 'NO Bots' },
    { name: 'Página Web' }
  ];

  // 5. Preparar Campos personalizados del Lead
  const devMeta = KOMMO_DEVELOPMENTS[devInteres] || { value: devInteres };
  const customFields = [
    {
      field_id: 2452621, // Desarrollo de Interés (multiselect)
      values: [
        devMeta.enum_id ? { enum_id: devMeta.enum_id } : { value: devMeta.value }
      ]
    },
    {
      field_id: 2442681, // Fuente / Origen
      values: [
        { value: 'Chatbot' }
      ]
    }
  ];

  // 6. Crear el Lead en Kommo en "Incoming leads" (sin responsable fijo para rotación automática)
  const leadTitle = `Cliengo - ${contact.name} (${devInteres})`;
  const createLeadUrl = `https://${KOMMO_SUBDOMAIN}.kommo.com/api/v4/leads`;

  const leadPayload = [
    {
      name: leadTitle,
      pipeline_id: PIPELINE_ID,
      status_id: STATUS_ID,
      custom_fields_values: customFields,
      _embedded: {
        tags: tags,
        contacts: contactId ? [{ id: contactId }] : []
      }
    }
  ];

  const leadRes = await fetch(createLeadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KOMMO_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(leadPayload)
  });

  const leadData = await leadRes.json();
  const createdLead = leadData._embedded?.leads?.[0];
  const newLeadId = createdLead?.id;

  if (!newLeadId) {
    throw new Error(`No se pudo crear el lead en Kommo: ${JSON.stringify(leadData)}`);
  }

  console.log(`Lead creado exitosamente en Kommo con ID: ${newLeadId}`);

  // 7. Insertar la transcripción del chat como Nota Interna en el Lead
  if (contact.message) {
    const formattedTranscript = formatChatTranscript(contact.message);
    await addNoteToKommo(newLeadId, formattedTranscript);
  }

  return {
    leadId: newLeadId,
    contactId: contactId,
    development: devInteres,
    status: 'created'
  };
}

/**
 * Busca un contacto en Kommo por teléfono o correo
 */
async function findContactInKommo(query) {
  try {
    const url = `https://${KOMMO_SUBDOMAIN}.kommo.com/api/v4/contacts?query=${encodeURIComponent(query)}&limit=1`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${KOMMO_TOKEN}`
      }
    });
    if (res.status === 204 || !res.ok) return null;
    const data = await res.json();
    return data._embedded?.contacts?.[0]?.id || null;
  } catch (e) {
    console.warn('Error buscando contacto en Kommo:', e);
    return null;
  }
}

/**
 * Crea un nuevo contacto en Kommo
 */
async function createContactInKommo(contact) {
  const customFields = [];
  if (contact.phone) {
    customFields.push({
      field_code: 'PHONE',
      values: [{ value: contact.phone, enum_code: 'MOB' }]
    });
  }
  if (contact.email) {
    customFields.push({
      field_code: 'EMAIL',
      values: [{ value: contact.email, enum_code: 'WORK' }]
    });
  }

  const payload = [
    {
      name: contact.name,
      custom_fields_values: customFields
    }
  ];

  const res = await fetch(`https://${KOMMO_SUBDOMAIN}.kommo.com/api/v4/contacts`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${KOMMO_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  return data._embedded?.contacts?.[0]?.id || null;
}

/**
 * Agrega una nota interna a un Lead en Kommo
 */
async function addNoteToKommo(leadId, noteText) {
  try {
    const notesUrl = `https://${KOMMO_SUBDOMAIN}.kommo.com/api/v4/leads/${leadId}/notes`;
    await fetch(notesUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KOMMO_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([
        {
          note_type: 'common',
          params: {
            text: noteText
          }
        }
      ])
    });
    console.log(`Nota de transcripción añadida al lead ${leadId}`);
  } catch (e) {
    console.error('Error agregando nota en Kommo:', e);
  }
}

/**
 * Da formato limpio y legible a la transcripción del chat de Cliengo
 */
function formatChatTranscript(rawMessage) {
  return `💬 Transcripción de Chat (Cliengo Chatbot):\n\n${rawMessage}\n\n• Canal: Chat Web\n• Capturado: ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`;
}
