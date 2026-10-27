/**
 * Webhook Serverless: Integración Cliengo Chatbot ⇄ Kommo CRM
 * Desplegable en Vercel Serverless Functions
 */

const KOMMO_SUBDOMAIN = process.env.KOMMO_SUBDOMAIN || 'casasriscos';
const KOMMO_TOKEN = process.env.KOMMO_TOKEN || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjljNTllYTQwYzVhNWQ1OTFjNTU1NjM0NWNmZDkzY2QzOTg4NTM0ZjYyNWI3NWEzMmMyMTkxN2NlNTU3NzY1MjFlNzdlYmNjMzg3MGEzNzZmIn0.eyJhdWQiOiIwNzMyNzIxMi1jOTBjLTQxMTgtYTk4Yi0wMmZmMWI3YmUzODQiLCJqdGkiOiI5YzU5ZWE0MGM1YTVkNTkxYzU1NTYzNDVjZmQ5M2NkMzk4ODUzNGY2MjViNzVhMzJjMjE5MTdjZTU1Nzc2NTIxZTc3ZWJjYzM4NzBhMzc2ZiIsImlhdCI6MTc5MDYxODU2NiwibmJmIjoxNzkwNjE4NTY2LCJleHAiOjE5MjQ5MDU2MDAsInN1YiI6IjczMDYxNjkiLCJncmFudF90eXBlIjoiIiwiYWNjb3VudF9pZCI6MzY0ODM5NjMsImJhc2VfZG9tYWluIjoia29tbW8uY29tIiwidmVyc2lvbiI6Miwic2NvcGVzIjpbImNybSIsImZpbGVzIiwiZmlsZXNfZGVsZXRlIiwibGlzdF9leHRlcm5hbF9tZXNzYWdlcyIsIm5vdGlmaWNhdGlvbnMiLCJwdXNoX25vdGlmaWNhdGlvbnMiLCJzZW5kX2V4dGVybmFsX21lc3NhZ2VzIiwidXNlcnNfYWN0aXZhdGUiLCJ1c2Vyc19hZGQiLCJ1c2Vyc19kZWFjdGl2YXRlIl0sImhhc2hfdXVpZCI6IjZkNThiNmI2LWQ5NmQtNDQwYy1iODIzLWY4NWVjMDM4ZDA3ZSIsImFwaV9kb21haW4iOiJhcGktZy5rb21tby5jb20ifQ.PhDQRJxM7x41nHyXC8kSAytjfErWROMfTjSMLqYjawudAm9huM6g59gL6OWbA1lmWUvFjxiWwZQ5KiLoKdtBj64JFxKJYPSFTQa_a_AGVWwjS8ih5oYh-PVN2wTsPiIgvhaTnTfAoy2U7F1J8MqAKXKUMf_h-C2tQeyKzMR6YuQbBvTSXdYSXnv3S5-b0IoPg0sycg5I3qTawqiHkveN1_jM4Woe4YsV0C96PK8tmy_rUDJOo5iunvYzh-LWfPTP2ZvmdWHPRV4OavOgfaBz20DM9hZpL-GVLF3fmjkuhla3bFKnuQYfvLr48SSDpEBOcoCbk-8ACPQwlHeuNh3Q7g';
const CLIENGO_API_KEY = process.env.CLIENGO_API_KEY || 'df73b0e5-8b20-40e1-8f60-f102b9f332a3';

// Pipeline y Etapa en Kommo: "Secuencia de Venta" -> "Contacto inicial"
const PIPELINE_ID = 13749307;
const STATUS_CONTACTO_INICIAL = 106080223;
const STATUS_VENTA_PERDIDA = 143;

// Interruptor de Pausa: Permite congelar la recepción de leads hacia Kommo hasta la fecha de entrega
const IS_PAUSED = true; // PAUSADO hasta la entrega formal dentro de 3 días

// Equipo oficial de Asesoras de Venta para asignación Round-Robin
const SALES_ADVISORS = [
  13193551, // Estrella Cruz
  13193555, // Daniela Martinez
  15556864  // Carolina Sánchez
];

let roundRobinIndex = 0;
function getNextSalesAdvisor() {
  const advisorId = SALES_ADVISORS[roundRobinIndex % SALES_ADVISORS.length];
  roundRobinIndex = (roundRobinIndex + 1) % SALES_ADVISORS.length;
  return advisorId;
}

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

    // Modo Pausa: Si la integración está en pausa comercial previa a la entrega
    if (IS_PAUSED) {
      console.log('Integración Cliengo en modo PAUSA. Petición recibida y respondida con 200 OK (sin alterar Kommo).');
      return res.status(200).json({
        status: 'paused',
        message: 'La integración se encuentra en pausa temporal previa a entrega formal.'
      });
    }

    // Extraer y normalizar datos del contacto de Cliengo
    const contactData = extractContactFromCliengo(body);

    if (!contactData || (!contactData.name && !contactData.phone && !contactData.email)) {
      return res.status(200).json({
        status: 'ignored',
        message: 'No se encontraron datos mínimos de contacto en el payload.',
        receivedBody: body
      });
    }

    // Debounce por teléfono o email para prevenir duplicados en ráfaga
    const dedupeKey = (contactData.phone || contactData.email || contactData.id || '').toLowerCase();
    if (dedupeKey) {
      const now = Date.now();
      const last = recentlyProcessed.get(dedupeKey);
      if (last && (now - last) < 30000) {
        console.log(`Contacto ${dedupeKey} procesado hace menos de 30s. Ignorando llamada repetida.`);
        return res.status(200).json({ status: 'ignored', reason: 'debounce_duplicate' });
      }
      recentlyProcessed.set(dedupeKey, now);
    }

    // Procesar creación / reactivación / actualización en Kommo
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
 * Normaliza y formatea el teléfono al formato internacional de México (+52)
 */
function formatMexicanPhone(rawPhone) {
  if (!rawPhone) return '';
  let clean = String(rawPhone).trim().replace(/[^\d+]/g, '');
  if (!clean) return '';

  // Si ya empieza con '+', revisar si tiene el prefijo de celular antiguo +521
  if (clean.startsWith('+')) {
    if (clean.startsWith('+521') && clean.length === 14) {
      return '+52' + clean.slice(4);
    }
    return clean;
  }

  // Si empieza con '521' y tiene 13 dígitos
  if (clean.startsWith('521') && clean.length === 13) {
    return '+52' + clean.slice(3);
  }

  // Si empieza con '52' y tiene 12 dígitos
  if (clean.startsWith('52') && clean.length === 12) {
    return '+' + clean;
  }

  // Si tiene 10 dígitos (número estándar mexicano fijo o móvil, ej: 4427525600)
  if (clean.length === 10) {
    return '+52' + clean;
  }

  // Si tiene más de 10 dígitos sin '+', prefijar '+'
  if (clean.length > 10) {
    return '+' + clean;
  }

  // En cualquier otro caso agregar prefijo +52
  return '+52' + clean;
}

/**
 * Normaliza y extrae los datos de contacto sin importar la variante del payload de Cliengo
 */
function extractContactFromCliengo(body) {
  const data = body.data || body.contact || body;

  const id = data.id || body.contactId || body.id || '';
  const name = (data.name || body.name || '').trim();
  const lastName = (data.lastName || body.lastName || '').trim();
  const fullName = [name, lastName].filter(Boolean).join(' ') || name || 'Lead Cliengo';

  const rawPhone = data.phone || data.internationalPhoneNumber || data.whatsappPhoneNumber || body.phone || '';
  const cleanPhone = formatMexicanPhone(rawPhone);

  const rawEmail = data.email || body.email || '';
  let cleanEmail = '';
  const emailMatch = String(rawEmail).match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch) {
    cleanEmail = emailMatch[0].toLowerCase();
  }

  // Transcripción o mensaje del chat
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
 * Fusiona etiquetas existentes con las nuevas, eliminando duplicados y omitiendo 'NO Bots'
 */
function mergeTags(existingTags = [], newTagNames = []) {
  const tagMap = new Map();
  for (const t of existingTags) {
    const name = (typeof t === 'string' ? t : t.name || '').trim();
    if (name && name.toLowerCase() !== 'no bots') {
      tagMap.set(name.toLowerCase(), { name });
    }
  }
  for (const name of newTagNames) {
    const trimmed = (name || '').trim();
    if (trimmed && trimmed.toLowerCase() !== 'no bots') {
      tagMap.set(trimmed.toLowerCase(), { name: trimmed });
    }
  }
  return Array.from(tagMap.values());
}

/**
 * Fusiona el desarrollo de interés en el campo multiselect (2452621) sin perder los anteriores
 */
function mergeDevelopment(existingCustomFields = [], devInteres) {
  const devMeta = KOMMO_DEVELOPMENTS[devInteres] || { value: devInteres };
  const targetEnumId = devMeta.enum_id;
  const targetValue = devMeta.value;

  const resultFields = [];
  let foundDevField = false;

  for (const cf of existingCustomFields) {
    if (cf.field_id === 2452621) {
      foundDevField = true;
      const existingValues = Array.isArray(cf.values) ? [...cf.values] : [];
      const alreadyHas = existingValues.some(v =>
        (targetEnumId && v.enum_id === targetEnumId) ||
        (v.value && v.value.toLowerCase() === targetValue.toLowerCase())
      );
      if (!alreadyHas) {
        existingValues.push(targetEnumId ? { enum_id: targetEnumId } : { value: targetValue });
      }
      resultFields.push({
        field_id: 2452621,
        values: existingValues.map(v => v.enum_id ? { enum_id: v.enum_id } : { value: v.value })
      });
    }
  }

  if (!foundDevField) {
    resultFields.push({
      field_id: 2452621,
      values: [targetEnumId ? { enum_id: targetEnumId } : { value: targetValue }]
    });
  }

  // Asegurar siempre Fuente = Chatbot (2442681)
  resultFields.push({
    field_id: 2442681,
    values: [{ value: 'Chatbot' }]
  });

  return resultFields;
}

/**
 * Crea una tarea para el asesor responsable en Kommo CRM
 */
async function createTaskInKommo(leadId, responsibleUserId, taskText) {
  try {
    const assignedUser = (responsibleUserId && responsibleUserId !== 7306169 && responsibleUserId !== 0)
      ? responsibleUserId
      : getNextSalesAdvisor();

    // Vencimiento a las 24 horas siguientes (timestamp en segundos)
    const completeTill = Math.floor(Date.now() / 1000) + 86400;

    const payload = [
      {
        responsible_user_id: assignedUser,
        entity_id: leadId,
        entity_type: 'leads',
        text: taskText,
        complete_till: completeTill
      }
    ];

    const res = await fetch(`https://${KOMMO_SUBDOMAIN}.kommo.com/api/v4/tasks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KOMMO_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Error creando tarea en Kommo (${res.status}): ${errText}`);
      return null;
    }

    const data = await res.json();
    const taskId = data._embedded?.tasks?.[0]?.id;
    console.log(`Tarea creada exitosamente en Kommo (ID: ${taskId}) asignada al asesor ${assignedUser}`);
    return taskId;
  } catch (err) {
    console.error('Error creando tarea en Kommo:', err);
    return null;
  }
}

/**
 * Procesa la recepción y reglas de asignación / reactivación en Kommo
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

  // 2. Buscar si el contacto ya existe en Kommo para evitar duplicación
  let existingContact = null;
  if (contact.phone) {
    existingContact = await findContactInKommo(contact.phone);
  }
  if (!existingContact && contact.email) {
    existingContact = await findContactInKommo(contact.email);
  }

  let contactId = existingContact?.id || null;

  // Si el contacto ya existía pero su teléfono no tenía +52, actualizárselo
  if (existingContact && contact.phone) {
    const currentPhone = existingContact.custom_fields_values?.find(f => f.field_code === 'PHONE')?.values?.[0]?.value || '';
    if (!currentPhone.startsWith('+')) {
      await updateContactPhone(existingContact.id, contact.phone);
    }
  }

  // Si no existía, crear contacto nuevo con teléfono formateado (+52...)
  if (!contactId) {
    contactId = await createContactInKommo(contact);
  }

  const tagsToAdd = [`Cliengo-${devInteres}`, 'Página Web'];

  // 3. Revisar si el contacto ya tiene Leads asociados
  let targetLead = null;
  let isLostLead = false;

  if (existingContact?.id) {
    const contactWithLeads = await getContactWithLeads(existingContact.id);
    const leadsList = contactWithLeads?._embedded?.leads || [];

    if (leadsList.length > 0) {
      // Buscar el lead más relevante: priorizar un lead activo; si no hay activo, tomar el último en perdido
      let activeLead = null;
      let lastLostLead = null;

      for (const leadRef of leadsList) {
        const fullLead = await getLeadFromKommo(leadRef.id);
        if (!fullLead) continue;

        if (fullLead.status_id !== STATUS_VENTA_PERDIDA && fullLead.status_id !== 142) {
          activeLead = fullLead;
          break; // encontramos lead activo
        } else if (fullLead.status_id === STATUS_VENTA_PERDIDA) {
          lastLostLead = fullLead;
        }
      }

      if (activeLead) {
        targetLead = activeLead;
        isLostLead = false;
      } else if (lastLostLead) {
        targetLead = lastLostLead;
        isLostLead = true;
      }
    }
  }

  // -------------------------------------------------------------
  // CASO 1: Lead Existente en VENTA PERDIDA (Status 143)
  // Regla: Reactivar a "Contacto inicial" en Secuencia de Venta, conservar su mismo asesor.
  // -------------------------------------------------------------
  if (targetLead && isLostLead) {
    console.log(`Lead existente ${targetLead.id} está en VENTA PERDIDA. Reactivando a Contacto Inicial...`);

    const mergedTags = mergeTags(targetLead._embedded?.tags || [], tagsToAdd);
    const updatedCustomFields = mergeDevelopment(targetLead.custom_fields_values || [], devInteres);

    // Si el lead no tenía asesor válido o estaba a nombre de Cristina (7306169), rotarlo
    let assignedAdvisor = targetLead.responsible_user_id;
    if (!assignedAdvisor || assignedAdvisor === 7306169 || assignedAdvisor === 0) {
      assignedAdvisor = getNextSalesAdvisor();
    }

    const patchPayload = {
      pipeline_id: PIPELINE_ID,
      status_id: STATUS_CONTACTO_INICIAL,
      responsible_user_id: assignedAdvisor,
      custom_fields_values: updatedCustomFields,
      _embedded: {
        tags: mergedTags
      }
    };

    await updateLeadInKommo(targetLead.id, patchPayload);

    // Agregar transcripción del chat como nota interna
    if (contact.message) {
      const formattedTranscript = formatChatTranscript(contact.message, devInteres);
      await addNoteToKommo(targetLead.id, formattedTranscript);
    }

    // Crear tarea para el asesor asignado
    const taskText = `💬 Recontacto Cliengo (${devInteres}): El cliente (estaba en Perdido) volvió a escribir por el bot web. Revisa el chat en notas y contáctalo.`;
    await createTaskInKommo(targetLead.id, assignedAdvisor, taskText);

    return {
      action: 'reactivated_lost_lead',
      leadId: targetLead.id,
      contactId: contactId,
      responsibleUserId: assignedAdvisor,
      development: devInteres,
      previousStatus: STATUS_VENTA_PERDIDA,
      newStatus: STATUS_CONTACTO_INICIAL
    };
  }

  // -------------------------------------------------------------
  // CASO 2: Lead Existente en OTRA ETAPA ACTIVA
  // Regla: Dejarlo donde esté (no alterar status ni pipeline).
  // -------------------------------------------------------------
  if (targetLead && !isLostLead) {
    console.log(`Lead existente ${targetLead.id} está activo en etapa ${targetLead.status_id}. Manteniendo su etapa actual.`);

    const mergedTags = mergeTags(targetLead._embedded?.tags || [], tagsToAdd);
    const updatedCustomFields = mergeDevelopment(targetLead.custom_fields_values || [], devInteres);

    let assignedAdvisor = targetLead.responsible_user_id;
    if (!assignedAdvisor || assignedAdvisor === 7306169 || assignedAdvisor === 0) {
      assignedAdvisor = getNextSalesAdvisor();
    }

    const patchPayload = {
      responsible_user_id: assignedAdvisor,
      custom_fields_values: updatedCustomFields,
      _embedded: {
        tags: mergedTags
      }
    };

    await updateLeadInKommo(targetLead.id, patchPayload);

    // Agregar transcripción del chat como nota interna
    if (contact.message) {
      const formattedTranscript = formatChatTranscript(contact.message, devInteres);
      await addNoteToKommo(targetLead.id, formattedTranscript);
    }

    // Crear tarea para el asesor asignado
    const taskText = `💬 Nueva conversación Cliengo (${devInteres}): El cliente interactuó con el bot web. Revisa el chat en notas para dar seguimiento.`;
    await createTaskInKommo(targetLead.id, assignedAdvisor, taskText);

    return {
      action: 'updated_active_lead',
      leadId: targetLead.id,
      contactId: contactId,
      responsibleUserId: assignedAdvisor,
      development: devInteres,
      currentStatus: targetLead.status_id
    };
  }

  // -------------------------------------------------------------
  // CASO 3: Lead Nuevo (Contacto nuevo o sin leads)
  // Regla: Asignación Round-Robin directa entre asesoras de ventas para garantizar
  // que NUNCA quede a nombre del usuario de soporte/API (Cristina).
  // -------------------------------------------------------------
  console.log(`Creando nuevo lead para ${contact.name} asignado mediante Round-Robin...`);

  const assignedAdvisor = getNextSalesAdvisor();
  const leadTitle = `Cliengo - ${contact.name} (${devInteres})`;
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

  const leadPayload = [
    {
      name: leadTitle,
      pipeline_id: PIPELINE_ID,
      status_id: STATUS_CONTACTO_INICIAL,
      responsible_user_id: assignedAdvisor,
      custom_fields_values: customFields,
      _embedded: {
        tags: [
          { name: `Cliengo-${devInteres}` },
          { name: 'Página Web' }
        ],
        contacts: contactId ? [{ id: contactId }] : []
      }
    }
  ];

  const createLeadUrl = `https://${KOMMO_SUBDOMAIN}.kommo.com/api/v4/leads`;
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

  console.log(`Lead nuevo creado exitosamente en Kommo (ID: ${newLeadId}) asignado a asesora ${assignedAdvisor}`);

  // Insertar transcripción de chat como nota interna
  if (contact.message) {
    const formattedTranscript = formatChatTranscript(contact.message, devInteres);
    await addNoteToKommo(newLeadId, formattedTranscript);
  }

  // Crear tarea de contacto inmediato para la asesora asignada
  const taskText = `💬 Nuevo lead Cliengo (${devInteres}): Prospecto recibido por el bot web. Revisa el chat en notas y contáctalo.`;
  await createTaskInKommo(newLeadId, assignedAdvisor, taskText);

  return {
    action: 'created_new_lead',
    leadId: newLeadId,
    contactId: contactId,
    responsibleUserId: assignedAdvisor,
    development: devInteres,
    status: STATUS_CONTACTO_INICIAL
  };
}

/**
 * Busca un contacto en Kommo por teléfono o correo
 */
async function findContactInKommo(query) {
  try {
    const cleanDigits = String(query).replace(/[^\d]/g, '');
    const searchTerm = (cleanDigits.length >= 10) ? cleanDigits.slice(-10) : query;

    const url = `https://${KOMMO_SUBDOMAIN}.kommo.com/api/v4/contacts?query=${encodeURIComponent(searchTerm)}&limit=1`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${KOMMO_TOKEN}`
      }
    });
    if (res.status === 204 || !res.ok) return null;
    const data = await res.json();
    return data._embedded?.contacts?.[0] || null;
  } catch (e) {
    console.warn('Error buscando contacto en Kommo:', e);
    return null;
  }
}

/**
 * Obtiene los detalles de un contacto con sus leads asociados
 */
async function getContactWithLeads(contactId) {
  try {
    const url = `https://${KOMMO_SUBDOMAIN}.kommo.com/api/v4/contacts/${contactId}?with=leads`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${KOMMO_TOKEN}`
      }
    });
    if (!res.ok || res.status === 204) return null;
    return await res.json();
  } catch (e) {
    console.warn('Error obteniendo contacto con leads:', e);
    return null;
  }
}

/**
 * Obtiene los detalles completos de un Lead en Kommo
 */
async function getLeadFromKommo(leadId) {
  try {
    const url = `https://${KOMMO_SUBDOMAIN}.kommo.com/api/v4/leads/${leadId}`;
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${KOMMO_TOKEN}`
      }
    });
    if (!res.ok || res.status === 204) return null;
    return await res.json();
  } catch (e) {
    console.warn(`Error obteniendo lead ${leadId}:`, e);
    return null;
  }
}

/**
 * Actualiza un Lead existente en Kommo
 */
async function updateLeadInKommo(leadId, patchData) {
  const url = `https://${KOMMO_SUBDOMAIN}.kommo.com/api/v4/leads/${leadId}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${KOMMO_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(patchData)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Error actualizando lead ${leadId} (${res.status}): ${errText}`);
  }

  return await res.json();
}

/**
 * Actualiza el teléfono de un contacto en Kommo para garantizar formato +52
 */
async function updateContactPhone(contactId, formattedPhone) {
  try {
    const url = `https://${KOMMO_SUBDOMAIN}.kommo.com/api/v4/contacts`;
    await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${KOMMO_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([
        {
          id: contactId,
          custom_fields_values: [
            {
              field_code: 'PHONE',
              values: [{ value: formattedPhone, enum_code: 'MOB' }]
            }
          ]
        }
      ])
    });
    console.log(`Teléfono actualizado a ${formattedPhone} en contacto ${contactId}`);
  } catch (e) {
    console.warn('Error actualizando teléfono de contacto:', e);
  }
}

/**
 * Crea un nuevo contacto en Kommo con teléfono normalizado (+52)
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
function formatChatTranscript(rawMessage, devInteres) {
  return `💬 Transcripción de Chat (Cliengo Chatbot):\n\n${rawMessage}\n\n• Proyecto: ${devInteres}\n• Canal: Chat Web\n• Capturado: ${new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`;
}
