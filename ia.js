window.RUTA_IA = (() => {
  const templates = {
    alistamiento: {
      cercano: (ctx) => `Hola ${ctx.acudiente}. La ruta ${ctx.ruta} ya se está alistando. ${ctx.extraLista} Por favor preparar a ${ctx.estudiante}.`,
      formal: (ctx) => `Buen día, ${ctx.acudiente}. Informamos que la ruta ${ctx.ruta} se encuentra en alistamiento. ${ctx.extraLista} Por favor tener preparado a ${ctx.estudiante}.`,
      breve: (ctx) => `Ruta ${ctx.ruta} alistándose. Preparar a ${ctx.estudiante}.`
    },
    barrio: {
      cercano: (ctx) => `Hola ${ctx.acudiente}. La ruta ya ingresó al barrio ${ctx.barrio}. Por favor alistar a ${ctx.estudiante}.`,
      formal: (ctx) => `Buen día, ${ctx.acudiente}. La ruta escolar ha ingresado al barrio ${ctx.barrio}. Por favor alistar a ${ctx.estudiante}.`,
      breve: (ctx) => `La ruta ya entró a ${ctx.barrio}. Alistar a ${ctx.estudiante}.`
    },
    cerca: {
      cercano: (ctx) => `Hola ${ctx.acudiente}. La ruta va cerca de su ubicación para recoger a ${ctx.estudiante} en ${ctx.barrio}.`,
      formal: (ctx) => `Buen día, ${ctx.acudiente}. La ruta se encuentra próxima al punto de recogida de ${ctx.estudiante} en ${ctx.barrio}.`,
      breve: (ctx) => `Ruta cerca para ${ctx.estudiante}.`
    },
    retraso: {
      cercano: (ctx) => `Hola ${ctx.acudiente}. Tenemos un retraso aproximado de ${ctx.minutos || 10} minutos para recoger a ${ctx.estudiante}.`,
      formal: (ctx) => `Buen día, ${ctx.acudiente}. Informamos un retraso aproximado de ${ctx.minutos || 10} minutos en la recogida de ${ctx.estudiante}.`,
      breve: (ctx) => `Retraso de ${ctx.minutos || 10} min para ${ctx.estudiante}.`
    },
    subio: {
      cercano: (ctx) => `Hola ${ctx.acudiente}. ${ctx.estudiante} ya subió a la ruta sin novedad.`,
      formal: (ctx) => `Buen día, ${ctx.acudiente}. Confirmamos que ${ctx.estudiante} ya abordó la ruta escolar.`,
      breve: (ctx) => `${ctx.estudiante} ya subió a la ruta.`
    },
    llegada_colegio: {
      cercano: (ctx) => `Hola ${ctx.acudiente}. ${ctx.estudiante} ya llegó al colegio correctamente.`,
      formal: (ctx) => `Buen día, ${ctx.acudiente}. Informamos que ${ctx.estudiante} llegó al colegio correctamente.`,
      breve: (ctx) => `${ctx.estudiante} llegó al colegio.`
    },
    entrega: {
      cercano: (ctx) => `Hola ${ctx.acudiente}. ${ctx.estudiante} ya fue entregado(a) sin novedad.`,
      formal: (ctx) => `Buen día, ${ctx.acudiente}. Confirmamos que ${ctx.estudiante} fue entregado(a) sin novedad.`,
      breve: (ctx) => `${ctx.estudiante} entregado(a) sin novedad.`
    },
    personalizado: {
      cercano: (ctx) => ctx.custom || `Hola ${ctx.acudiente}. Tenemos una novedad con la ruta.`,
      formal: (ctx) => ctx.custom || `Buen día. Compartimos una novedad de la ruta escolar.`,
      breve: (ctx) => ctx.custom || `Novedad de la ruta.`
    }
  };

  function buildMassiveRouteMessage(routeName, list) {
    const lines = list.map((s) => `${s.orden}. ${s.nombre} - ${s.barrio}`);
    return `🚌 ${routeName}\n\nLa ruta se está alistando.\nOrden de recogida:\n${lines.join("\n")}\n\nPor favor preparar a los estudiantes.`;
  }

  function generate(type, tone, ctx) {
    const bucket = templates[type] || templates.personalizado;
    const fn = bucket[tone] || bucket.cercano;
    return fn(ctx);
  }

  function ask(question, state = {}) {
    const q = (question || '').toLowerCase();
    if (q.includes('retras')) return 'Mensaje sugerido: Buen día. Tenemos un retraso aproximado de 10 minutos. Gracias por su comprensión.';
    if (q.includes('alist')) return 'Sugerencia: usa un mensaje corto y claro, indicando ruta, orden de recogida y solicitud de alistar a los estudiantes.';
    if (q.includes('faltan')) return `Pendientes actuales: ${state.pending || 0}. Estudiante actual: ${state.current || 'sin iniciar'}.`;
    if (q.includes('barrio')) return 'Puedes usar el aviso de ingreso al barrio para notificar a todos los acudientes de ese sector.';
    return 'Puedo ayudarte a redactar mensajes de alistamiento, retraso, ingreso al barrio, llegada al colegio y entrega.';
  }

  return { generate, ask, buildMassiveRouteMessage };
})();
