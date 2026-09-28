/**
 * Webhook Middleware: Integración Kommo CRM ⇄ Signy Riscos
 * Desplegable en Vercel Serverless Functions
 */

const KOMMO_SUBDOMAIN = process.env.KOMMO_SUBDOMAIN || 'casasriscos';
const KOMMO_TOKEN = process.env.KOMMO_TOKEN || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjljNTllYTQwYzVhNWQ1OTFjNTU1NjM0NWNmZDkzY2QzOTg4NTM0ZjYyNWI3NWEzMmMyMTkxN2NlNTU3NzY1MjFlNzdlYmNjMzg3MGEzNzZmIn0.eyJhdWQiOiIwNzMyNzIxMi1jOTBjLTQxMTgtYTk4Yi0wMmZmMWI3YmUzODQiLCJqdGkiOiI5YzU5ZWE0MGM1YTVkNTkxYzU1NTYzNDVjZmQ5M2NkMzk4ODUzNGY2MjViNzVhMzJjMjE5MTdjZTU1Nzc2NTIxZTc3ZWJjYzM4NzBhMzc2ZiIsImlhdCI6MTc5MDYxODU2NiwibmJmIjoxNzkwNjE4NTY2LCJleHAiOjE5MjQ5MDU2MDAsInN1YiI6IjczMDYxNjkiLCJncmFudF90eXBlIjoiIiwiYWNjb3VudF9pZCI6MzY0ODM5NjMsImJhc2VfZG9tYWluIjoia29tbW8uY29tIiwidmVyc2lvbiI6Miwic2NvcGVzIjpbImNybSIsImZpbGVzIiwiZmlsZXNfZGVsZXRlIiwibGlzdF9leHRlcm5hbF9tZXNzYWdlcyIsIm5vdGlmaWNhdGlvbnMiLCJwdXNoX25vdGlmaWNhdGlvbnMiLCJzZW5kX2V4dGVybmFsX21lc3NhZ2VzIiwidXNlcnNfYWN0aXZhdGUiLCJ1c2Vyc19hZGQiLCJ1c2Vyc19kZWFjdGl2YXRlIl0sImhhc2hfdXVpZCI6IjZkNThiNmI2LWQ5NmQtNDQwYy1iODIzLWY4NWVjMDM4ZDA3ZSIsImFwaV9kb21haW4iOiJhcGktZy5rb21tby5jb20ifQ.PhDQRJxM7x41nHyXC8kSAytjfErWROMfTjSMLqYjawudAm9huM6g59gL6OWbA1lmWUvFjxiWwZQ5KiLoKdtBj64JFxKJYPSFTQa_a_AGVWwjS8ih5oYh-PVN2wTsPiIgvhaTnTfAoy2U7F1J8MqAKXKUMf_h-C2tQeyKzMR6YuQbBvTSXdYSXnv3S5-b0IoPg0sycg5I3qTawqiHkveN1_jM4Woe4YsV0C96PK8tmy_rUDJOo5iunvYzh-LWfPTP2ZvmdWHPRV4OavOgfaBz20DM9hZpL-GVLF3fmjkuhla3bFKnuQYfvLr48SSDpEBOcoCbk-8ACPQwlHeuNh3Q7g';

const SIGNY_API_URL = process.env.SIGNY_API_URL || 'https://signy-api.proxy.beeceptor.com/signy/system/api_tools/';
const SIGNY_TOKEN = process.env.SIGNY_TOKEN || '28aeb4015e3ea66c85067d4727f9acc0467a319ee1715e60c09a4ca97bbe6dfc';
const SIGNY_CLIENT = process.env.SIGNY_CLIENT || 'signy_riscos';
const SIGNY_SERVICE = process.env.SIGNY_SERVICE || 'kommo_leads';

// Etiqueta oficial para evitar duplicados
const SYNCED_TAG = 'Sincronizado Signy';

// Cache en memoria para descartar peticiones casi instantáneas para el mismo lead
const recentlyProcessed = new Map();

// Mapeo oficial de Asesores Kommo (ID de Usuario) -> Signy Username
const ADVISORS_MAP = {
  13193551: 'Estrella.Cruz',
  13193555: 'Daniela.Martinez',
  15556864: 'carolina.sanchez',
  15276199: 'jehosua.luna',
  'default': 'jehosua.luna'
};

// Catálogo de Orígenes permitidos en Signy
const VALID_ORIGINS = [
  'Chatbot',
  'Facebook',
  'Instagram',
  'Llamada',
  'Página Web',
  'Portales Inmobiliarios',
  'Remarketing Facebook',
  'Remarketing Instagram',
  'Tiktok',
  'Whatsapp',
  'WhatsApp Bot'
];

/**
 * Función principal Serverless (Vercel Handler)
 */
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Healthcheck GET
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      message: 'Middleware Kommo ⇄ Signy Riscos está activo y funcionando.',
      timestamp: new Date().toISOString()
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const leadIds = extractLeadIds(req.body);

    if (!leadIds || leadIds.length === 0) {
      return res.status(200).json({
        status: 'ignored',
        message: 'No se encontró ningún ID de lead en la solicitud.',
        receivedBody: req.body
      });
    }

    const results = [];

    // Procesar cada lead
    for (const leadId of leadIds) {
      try {
        const now = Date.now();
        const lastProcessed = recentlyProcessed.get(leadId);
        if (lastProcessed && (now - lastProcessed) < 30000) {
          console.log(`Lead ${leadId} procesado hace menos de 30s. Descartando llamada duplicada.`);
          results.push({ leadId, status: 'ignored', reason: 'debounce_duplicate' });
          continue;
        }

        recentlyProcessed.set(leadId, now);

        console.log(`Procesando Lead ID: ${leadId}`);
        const result = await processLead(leadId);
        results.push(result);
      } catch (leadError) {
        console.error(`Error procesando lead ${leadId}:`, leadError);
        results.push({ leadId, status: 'error', error: leadError.message });
      }
    }

    return res.status(200).json({
      status: 'ok',
      processed: results
    });

  } catch (err) {
    console.error('Error general en el Webhook:', err);
    return res.status(500).json({
      status: 'error',
      message: err.message
    });
  }
};

/**
 * Extrae los IDs de leads soportando Form URL-Encoded y JSON
 */
function extractLeadIds(body) {
  if (!body) return [];

  const ids = new Set();

  if (typeof body === 'string') {
    const regex = /leads\[(?:status|add|update)\]\[\d+\]\[id\]=(\d+)/g;
    let match;
    while ((match = regex.exec(body)) !== null) {
      ids.add(Number(match[1]));
    }
    const regexFallback = /\[id\]=(\d+)/g;
    while ((match = regexFallback.exec(body)) !== null) {
      ids.add(Number(match[1]));
    }
  }

  if (typeof body === 'object') {
    if (body.lead_id) ids.add(Number(body.lead_id));
    if (body.id) ids.add(Number(body.id));

    for (const key in body) {
      if (key.includes('[id]') || key.endsWith('.id') || key === 'id') {
        const val = Number(body[key]);
        if (!isNaN(val) && val > 0) ids.add(val);
      }
    }

    if (body.leads) {
      for (const action of ['status', 'add', 'update']) {
        if (Array.isArray(body.leads[action])) {
          body.leads[action].forEach(item => {
            if (item && item.id) ids.add(Number(item.id));
          });
        }
      }
    }
  }

  return Array.from(ids);
}

/**
 * Procesa la sincronización de un Lead individual
 */
async function processLead(leadId) {
  // 1. Obtener detalles del Lead desde Kommo
  const leadUrl = `https://${KOMMO_SUBDOMAIN}.kommo.com/api/v4/leads/${leadId}?with=contacts`;
  const leadRes = await fetch(leadUrl, {
    headers: {
      'Authorization': `Bearer ${KOMMO_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  if (!leadRes.ok) {
    const errText = await leadRes.text();
    throw new Error(`Error obteniendo lead de Kommo (${leadRes.status}): ${errText}`);
  }

  const lead = await leadRes.json();

  // 2. Control de duplicados: Verificar si ya tiene la etiqueta "Sincronizado Signy"
  const existingTags = lead._embedded?.tags || [];
  const alreadySynced = existingTags.some(t => t.name === SYNCED_TAG);

  if (alreadySynced) {
    console.log(`Lead ${leadId} ya tiene la etiqueta "${SYNCED_TAG}". Omitiendo para no duplicar en Signy.`);
    return {
      leadId,
      status: 'ignored',
      reason: 'already_synced_tag_present'
    };
  }

  // 3. Extraer información del contacto
  let contactName = lead.name || 'Lead sin nombre';
  let contactPhone = '';
  let contactEmail = '';

  const mainContact = lead._embedded?.contacts?.[0];
  if (mainContact && mainContact.id) {
    const contactUrl = `https://${KOMMO_SUBDOMAIN}.kommo.com/api/v4/contacts/${mainContact.id}`;
    const contactRes = await fetch(contactUrl, {
      headers: {
        'Authorization': `Bearer ${KOMMO_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (contactRes.ok) {
      const contactData = await contactRes.json();
      if (contactData.name) contactName = contactData.name;

      if (contactData.custom_fields_values) {
        for (const cf of contactData.custom_fields_values) {
          if (cf.field_code === 'PHONE' || cf.field_name?.toLowerCase().includes('phone') || cf.field_name?.toLowerCase().includes('teléfono')) {
            contactPhone = cf.values?.[0]?.value || '';
          }
          if (cf.field_code === 'EMAIL' || cf.field_name?.toLowerCase().includes('email') || cf.field_name?.toLowerCase().includes('correo')) {
            contactEmail = cf.values?.[0]?.value || '';
          }
        }
      }
    }
  }

  // Limpiar y validar teléfono (mínimo 10 dígitos)
  let cleanPhone = (contactPhone || '').replace(/[^\d+]/g, '');
  if (cleanPhone.length < 10) {
    cleanPhone = '';
  }

  // Validación previa de datos obligatorios de contacto (al menos uno requerido)
  if (!cleanPhone && !contactEmail) {
    const errorNote = '⚠️ No se pudo sincronizar con Signy Riscos:\n• Motivo: El contacto no cuenta con un teléfono válido (mínimo 10 dígitos) ni correo electrónico.';
    await addNoteToKommoLead(lead.id, errorNote);

    // Crear tarea pendiente para el asesor responsable
    const taskText = '⚠️ Completar datos para Signy: Agregar teléfono válido (mín. 10 dígitos) o correo electrónico al contacto.';
    await createTaskInKommo(lead.id, lead.responsible_user_id, taskText);

    return {
      leadId: lead.id,
      signyStatus: 'skipped_incomplete_contact',
      message: 'Falta teléfono y correo'
    };
  }

  // 4. Extraer Campos Personalizados del Lead
  let desarrolloInteres = '';
  let origenLead = '';

  if (lead.custom_fields_values) {
    for (const cf of lead.custom_fields_values) {
      if (cf.field_id === 2452621 || cf.field_name?.toLowerCase().includes('desarrollo')) {
        desarrolloInteres = cf.values?.[0]?.value || '';
      }
      if (cf.field_id === 2442681 || cf.field_name?.toLowerCase().includes('fuente') || cf.field_name?.toLowerCase().includes('origen')) {
        origenLead = cf.values?.[0]?.value || '';
      }
    }
  }

  // Homologar Origen contra catálogo de Signy
  let matchedOrigin = VALID_ORIGINS.find(o => o.toLowerCase() === (origenLead || '').toLowerCase());
  if (!matchedOrigin) {
    const oLower = (origenLead || '').toLowerCase();
    if (oLower.includes('face')) matchedOrigin = 'Facebook';
    else if (oLower.includes('insta')) matchedOrigin = 'Instagram';
    else if (oLower.includes('tik')) matchedOrigin = 'Tiktok';
    else if (oLower.includes('whats')) matchedOrigin = 'Whatsapp';
    else matchedOrigin = 'Página Web';
  }

  if (!desarrolloInteres) {
    desarrolloInteres = 'CONDESA';
  }

  // 5. Mapear Asesor asignado
  const asesorSigny = ADVISORS_MAP[lead.responsible_user_id] || ADVISORS_MAP['default'];

  // 6. Construir Body exacto para Signy API
  const signyPayload = {
    evento: 'crear',
    id_lead_kommo: String(lead.id),
    nombre: contactName,
    telefono: cleanPhone,
    correo: contactEmail,
    asesor: asesorSigny,
    origen: matchedOrigin,
    desarrollo_interes: desarrolloInteres
  };

  console.log('Enviando a Signy API:', JSON.stringify(signyPayload));

  // 7. Enviar a Signy API
  const signyRes = await fetch(SIGNY_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SIGNY_TOKEN}`,
      'X-Client': SIGNY_CLIENT,
      'X-Service': SIGNY_SERVICE,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(signyPayload)
  });

  const signyData = await signyRes.json();
  console.log('Respuesta de Signy:', JSON.stringify(signyData));

  // 8. Escribir Nota y agregar Etiqueta "Sincronizado Signy" en Kommo
  let noteText = '';
  if (signyData.status === 'ok') {
    const idProceso = signyData.info?.datos?.id_proceso || 'N/A';
    const idOp = signyData.info?.datos?.id_operacion || 'N/A';
    noteText = `✅ Sincronizado exitosamente con Signy Riscos.\n• ID Prospecto Signy: ${idProceso}\n• Folio Operación: ${idOp}\n• Asesor: ${asesorSigny}\n• Desarrollo: ${desarrolloInteres}`;

    // Añadir la etiqueta de sincronizado para que no se vuelva a sincronizar
    await addTagToKommoLead(lead.id, existingTags, SYNCED_TAG);
  } else {
    const errorMsg = signyData.message || signyData.info?.mensaje_operacion || 'Error desconocido';
    noteText = `⚠️ Advertencia de Sincronización Signy Riscos:\n• Motivo: ${errorMsg}`;

    // Crear tarea pendiente para el asesor si Signy rechazó la información
    const taskText = `⚠️ Revisar datos para Signy: ${errorMsg}. Por favor actualiza la información del lead.`;
    await createTaskInKommo(lead.id, lead.responsible_user_id, taskText);
  }

  await addNoteToKommoLead(lead.id, noteText);

  return {
    leadId: lead.id,
    signyStatus: signyData.status,
    response: signyData
  };
}

/**
 * Crea una tarea automática asignada al asesor responsable en Kommo
 */
async function createTaskInKommo(leadId, responsibleUserId, taskText) {
  try {
    const tasksUrl = `https://${KOMMO_SUBDOMAIN}.kommo.com/api/v4/tasks`;
    const dueTime = Math.floor(Date.now() / 1000) + (24 * 3600); // Vence en 24 horas

    await fetch(tasksUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KOMMO_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([
        {
          responsible_user_id: responsibleUserId,
          entity_id: leadId,
          entity_type: 'leads',
          text: taskText,
          complete_till: dueTime
        }
      ])
    });
    console.log(`Tarea creada exitosamente en el lead ${leadId} para el usuario ${responsibleUserId}`);
  } catch (e) {
    console.error('Error creando tarea en Kommo:', e);
  }
}

/**
 * Agrega la etiqueta al Lead en Kommo para evitar duplicados
 */
async function addTagToKommoLead(leadId, existingTags, newTagName) {
  try {
    const updatedTags = existingTags.map(t => ({ name: t.name }));
    updatedTags.push({ name: newTagName });

    const patchUrl = `https://${KOMMO_SUBDOMAIN}.kommo.com/api/v4/leads/${leadId}`;
    await fetch(patchUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${KOMMO_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        _embedded: {
          tags: updatedTags
        }
      })
    });
    console.log(`Etiqueta "${newTagName}" añadida exitosamente al lead ${leadId}`);
  } catch (e) {
    console.error('Error añadiendo etiqueta a Kommo:', e);
  }
}

/**
 * Agrega una nota interna al Lead en Kommo
 */
async function addNoteToKommoLead(leadId, noteText) {
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
  } catch (e) {
    console.error('Error agregando nota en Kommo:', e);
  }
}
