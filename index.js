const {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder,
  AttachmentBuilder
} = require('discord.js');

const fs = require('fs');
const path = require('path');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID || '1495968384259592503';
const GUILD_ID = '1188377448346288158';

const config = {
  guildName: 'LINEA ROJA',

  transcriptChannelId: '1496669850586845204',
  rankingChannelId: '1497850906849443840',

  guidePanelChannelId: '1496674973622734900',
  infoWelcomeChannelId: '1496675767638032394',
  bannerWelcomeChannelId: '1495196891124600853',

  bannerUrl: 'https://cdn.discordapp.com/attachments/1495196888562012191/1497848810695819384/ChatGPT_Image_26_abr_2026_12_35_04_a.m..png?ex=69ef03e9&is=69edb269&hm=d1b7c40c22611e9a03ca7d46df62d901a6b959798af891569701ebfa339392e0&',
  logoUrl: 'https://cdn.discordapp.com/attachments/1495196888562012191/1497833637448650903/logoLNR-sinfondo.png?ex=69eef5c7&is=69eda447&hm=19c61107ebe4300a21236db3fd46dce6352f93c18911a1aa766b240d04037823&'
};

const guideTickets = {
  guide_staff: {
    name: 'staff',
    title: 'Postulación Staff',
    categoryName: 'Postulación Staff',
    categoryId: '1495582414984970261',
    roleId: '1496645390483722341'
  },
  guide_org: {
    name: 'organizacion',
    title: 'Crear Organización',
    categoryName: 'Crear Organización',
    categoryId: '1496662348998643794',
    roleId: '1495196576946327653'
  },
  guide_police: {
    name: 'policia',
    title: 'Postulación Policía',
    categoryName: 'Postulación Policía',
    categoryId: '1496662415629095002',
    roleId: '1496644453501501532'
  }
};

const generalTickets = {
  gen_soporte: {
    name: 'soporte',
    title: 'Soporte',
    categoryName: 'Soporte',
    categoryId: '1495580733274587237',
    roleId: '1495196578246557889'
  },
  gen_reportes: {
    name: 'reportes',
    title: 'Reportes',
    categoryName: 'Reportes',
    categoryId: '1495582547046957197',
    roleId: '1495196578246557889'
  },
  gen_donaciones: {
    name: 'donaciones',
    title: 'Donaciones',
    categoryName: 'Donaciones',
    categoryId: '1495582260957679770',
    roleId: '1495581556117475369'
  },
  gen_apelar: {
    name: 'apelar-ban',
    title: 'Apelar Ban',
    categoryName: 'Apelar Ban',
    categoryId: '1495582620740751400',
    roleId: '1495581737017802843'
  },
  gen_cks: {
    name: 'cks-pkts',
    title: 'CKS / PKTS',
    categoryName: 'CKS / PKTS',
    categoryId: '1495582706359074938',
    roleId: '1495581819167309886'
  },
  gen_staff: {
    name: 'postulacion-staff',
    title: 'Postulación Staff',
    categoryName: 'Postulación Staff',
    categoryId: '1495582414984970261',
    roleId: '1496645390483722341'
  },
  gen_bugs: {
    name: 'bugs',
    title: 'Reportar Bugs',
    categoryName: 'Reportar Bugs',
    categoryId: '1497851653250879548',
    roleId: '1495196578246557889'
  },
  gen_recompensa: {
    name: 'recompensa',
    title: 'Reclamar Recompensa',
    categoryName: 'Reclamar Recompensa',
    categoryId: '1497851786025893949',
    roleId: '1495196578246557889'
  }
};

const CLAIMS_FILE = path.join(__dirname, 'claims.json');
const RANKING_FILE = path.join(__dirname, 'ranking_message.json');

function ensureFile(file, fallback) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(fallback, null, 2), 'utf8');
}

function readJson(file, fallback) {
  ensureFile(file, fallback);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function incrementClaim(user) {
  const claims = readJson(CLAIMS_FILE, {});
  if (!claims[user.id]) claims[user.id] = { tag: user.tag, count: 0 };
  claims[user.id].tag = user.tag;
  claims[user.id].count += 1;
  writeJson(CLAIMS_FILE, claims);
  return claims[user.id].count;
}

function getTopClaimers(limit = 10) {
  const claims = readJson(CLAIMS_FILE, {});
  return Object.entries(claims)
    .map(([userId, data]) => ({ userId, tag: data.tag, count: data.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

function sanitizeChannelName(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90);
}

function getAllTickets() {
  return { ...guideTickets, ...generalTickets };
}

function getTicketByType(type) {
  return getAllTickets()[type] || null;
}

function getTicketInfoFromChannel(channel) {
  if (!channel?.topic) return null;
  const owner = channel.topic.match(/ticketOwner:(\d+)/)?.[1];
  const type = channel.topic.match(/ticketType:([a-zA-Z0-9_-]+)/)?.[1];
  const data = type ? getTicketByType(type) : null;
  if (!owner || !type || !data) return null;
  return { ownerId: owner, type, data };
}

function canManageTicket(interaction) {
  const info = getTicketInfoFromChannel(interaction.channel);
  if (!info) return false;
  const member = interaction.member;
  if (!member?.roles?.cache) return false;
  return member.roles.cache.has(info.data.roleId);
}

function noPermission() {
  return {
    content: 'Solo los miembros encargados de este ticket pueden utilizar este comando.',
    ephemeral: true
  };
}

function buildTicketButtons({ claimed = false } = {}) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('ticket_close')
      .setLabel('Cerrar')
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('ticket_transcript')
      .setLabel('Transcript')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('ticket_claim')
      .setLabel(claimed ? 'Ticket asumido' : 'Asumir ticket')
      .setStyle(ButtonStyle.Success)
      .setDisabled(claimed),
    new ButtonBuilder()
      .setCustomId('ticket_rename')
      .setLabel('Renombrar canal')
      .setStyle(ButtonStyle.Primary)
  );
}

function buildTicketEmbed(user, data) {
  return new EmbedBuilder()
    .setColor(0xff0000)
    .setAuthor({ name: 'LineaRojaRp', iconURL: config.logoUrl })
    .setDescription(
      [
        'Bienvenido a los tickets **LineaRojaRp**. Los miembros del staff te atenderán lo más rápido posible.',
        '',
        '**Usuario**',
        `<@${user.id}>`,
        '',
        '**Categoría**',
        data.categoryName,
        '',
        '**Staff**',
        '`Nadie ha asumido el ticket`',
        '',
        '**Estado del ticket**',
        '`El ticket está actualmente abierto`'
      ].join('\n')
    )
    .setThumbnail(config.logoUrl);
}

function buildGuidePanel() {
  const embed = new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle('# <:alarta:1194861655264338062> GUIA PARA LOS NUEVOS')
    .setDescription(
      [
        '<a:emoji_211:1326671803690647695> Si deseas postular tu organización, ser policia o formar parte de la staff abre ticket presionando los botones de abajo.',
        '',
        '```⛔ INFORMACION IMPORTANTE ⛔```',
        '<:add:1325597577210626068> **Policía:** Tener un mínimo de conocimientos sobre códigos y roleplay.',
        '',
        '<:add:1325597577210626068> **Crear Tu Organización:** Minimo **5 integrantes**.',
        '',
        '<:add:1325597577210626068> **Staff:** Tener conocimiento sobre roleplay y tener claras las normativas de LineaRojaRp.',
        '',
        '👇 **¡SI ESTAS INTERESADO EN POSTULAR PRESIONA EL BOTON CORRESPONDIENTE!** 👇'
      ].join('\n')
    )
    .setThumbnail(config.logoUrl)
    .setImage(config.bannerUrl)
    .setFooter({ text: `${config.guildName} • Sistema de Tickets` });

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('open_guide_staff').setLabel('Postulación Staff').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('open_guide_org').setLabel('Crear Organización').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('open_guide_police').setLabel('Postulación Policía').setStyle(ButtonStyle.Primary)
  );

  return { embeds: [embed], components: [row] };
}

function buildGeneralPanel() {
  const embed = new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle('Sistema de Tickets Linea Roja RP')
    .setDescription(
      [
        '**¿En qué podemos ayudarte?**',
        '',
        'Para brindarte una mejor atención, abre tu ticket en la categoría correcta.',
        'Si abres un ticket en una categoría que no corresponde, el staff podrá cerrarlo o indicarte dónde abrirlo correctamente.',
        '',
        '**Categorías disponibles:**',
        '',
        '🛠️ **Soporte**',
        'Dudas generales, problemas o ayuda dentro del servidor.',
        '',
        '📢 **Reportes**',
        'Reporta jugadores, situaciones IC/OOC o incumplimientos de normativa.',
        '',
        '💎 **Donaciones**',
        'Información o soporte relacionado con compras, beneficios o paquetes.',
        '',
        '🚫 **Apelar Ban**',
        'Solicita revisión de una sanción o baneo.',
        '',
        '💀 **CKS / PKTS**',
        'Solicitudes relacionadas con CK, PKT o procesos de rol importantes.',
        '',
        '👮 **Postulación Staff**',
        'Postúlate para formar parte del equipo administrativo.',
        '',
        '🐞 **Reportar Bugs**',
        'Reporta errores, fallos o problemas técnicos del servidor.',
        '',
        '🎁 **Reclamar Recompensa**',
        'Solicita la revisión o entrega de recompensas pendientes.',
        '',
        '**Selecciona el botón correspondiente para abrir tu ticket.**'
      ].join('\n')
    )
    .setThumbnail(config.logoUrl)
    .setImage(config.bannerUrl)
    .setFooter({ text: `${config.guildName} • Tickets Generales` });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('open_gen_soporte').setLabel('Soporte').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('open_gen_reportes').setLabel('Reportes').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('open_gen_donaciones').setLabel('Donaciones').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('open_gen_apelar').setLabel('Apelar Ban').setStyle(ButtonStyle.Danger)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('open_gen_cks').setLabel('CKS / PKTS').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('open_gen_staff').setLabel('Postulación Staff').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('open_gen_bugs').setLabel('Reportar Bugs').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('open_gen_recompensa').setLabel('Reclamar Recompensa').setStyle(ButtonStyle.Success)
  );

  return { embeds: [embed], components: [row1, row2] };
}

function buildModal(type) {
  if (type === 'guide_staff') {
    const modal = new ModalBuilder().setCustomId('modal_guide_staff').setTitle('Postulación Staff');

    const q1 = new TextInputBuilder().setCustomId('nombre_edad').setLabel('Nombre y edad').setStyle(TextInputStyle.Short).setRequired(true);
    const q2 = new TextInputBuilder().setCustomId('experiencia_staff').setLabel('Experiencia en staff').setStyle(TextInputStyle.Paragraph).setRequired(true);
    const q3 = new TextInputBuilder().setCustomId('horario').setLabel('Horario disponible').setStyle(TextInputStyle.Short).setRequired(true);
    const q4 = new TextInputBuilder().setCustomId('motivo_staff').setLabel('Por que quieres ser staff').setStyle(TextInputStyle.Paragraph).setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(q1),
      new ActionRowBuilder().addComponents(q2),
      new ActionRowBuilder().addComponents(q3),
      new ActionRowBuilder().addComponents(q4)
    );

    return modal;
  }

  if (type === 'guide_org') {
    const modal = new ModalBuilder().setCustomId('modal_guide_org').setTitle('Crear Organización');

    const q1 = new TextInputBuilder().setCustomId('nombre_org').setLabel('Nombre de la organización').setStyle(TextInputStyle.Short).setRequired(true);
    const q2 = new TextInputBuilder().setCustomId('lider_org').setLabel('Nombre del líder').setStyle(TextInputStyle.Short).setRequired(true);
    const q3 = new TextInputBuilder().setCustomId('miembros_org').setLabel('Cuántos miembros tienes').setPlaceholder('Mínimo 5 integrantes para crearla').setStyle(TextInputStyle.Short).setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(q1),
      new ActionRowBuilder().addComponents(q2),
      new ActionRowBuilder().addComponents(q3)
    );

    return modal;
  }

  if (type === 'guide_police') {
    const modal = new ModalBuilder().setCustomId('modal_guide_police').setTitle('Postulación Policía');

    const q1 = new TextInputBuilder().setCustomId('nombre_usuario').setLabel('Nombre y usuario de Discord').setStyle(TextInputStyle.Short).setRequired(true);
    const q2 = new TextInputBuilder().setCustomId('edad').setLabel('Edad').setStyle(TextInputStyle.Short).setRequired(true);
    const q3 = new TextInputBuilder().setCustomId('experiencia').setLabel('Experiencia en roles policiales').setPlaceholder('Cuánto tiempo y media').setStyle(TextInputStyle.Paragraph).setRequired(true);
    const q4 = new TextInputBuilder().setCustomId('motivo').setLabel('Por que quieres ser policía').setStyle(TextInputStyle.Paragraph).setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(q1),
      new ActionRowBuilder().addComponents(q2),
      new ActionRowBuilder().addComponents(q3),
      new ActionRowBuilder().addComponents(q4)
    );

    return modal;
  }

  if (type === 'rename') {
    const modal = new ModalBuilder().setCustomId('modal_rename_ticket').setTitle('Renombrar canal');
    const q1 = new TextInputBuilder().setCustomId('new_channel_name').setLabel('Nuevo nombre del canal').setPlaceholder('Ej: soporte-jota').setStyle(TextInputStyle.Short).setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(q1));
    return modal;
  }

  return null;
}

function getAnswersFromModal(interaction) {
  if (interaction.customId === 'modal_guide_staff') {
    return {
      data: guideTickets.guide_staff,
      type: 'guide_staff',
      answers: [
        ['Nombre y edad', interaction.fields.getTextInputValue('nombre_edad')],
        ['Experiencia en staff', interaction.fields.getTextInputValue('experiencia_staff')],
        ['Horario disponible', interaction.fields.getTextInputValue('horario')],
        ['Por que quieres ser staff', interaction.fields.getTextInputValue('motivo_staff')]
      ]
    };
  }

  if (interaction.customId === 'modal_guide_org') {
    return {
      data: guideTickets.guide_org,
      type: 'guide_org',
      answers: [
        ['Nombre de la organización', interaction.fields.getTextInputValue('nombre_org')],
        ['Nombre del líder', interaction.fields.getTextInputValue('lider_org')],
        ['Cuántos miembros tienes', interaction.fields.getTextInputValue('miembros_org')]
      ]
    };
  }

  if (interaction.customId === 'modal_guide_police') {
    return {
      data: guideTickets.guide_police,
      type: 'guide_police',
      answers: [
        ['Nombre y usuario de Discord', interaction.fields.getTextInputValue('nombre_usuario')],
        ['Edad', interaction.fields.getTextInputValue('edad')],
        ['Experiencia en roles policiales', interaction.fields.getTextInputValue('experiencia')],
        ['Por que quieres ser policía', interaction.fields.getTextInputValue('motivo')]
      ]
    };
  }

  return null;
}

async function createTicket(interaction, type, answers = []) {
  const data = getTicketByType(type);
  if (!data) {
    return interaction.reply({ content: 'Ese tipo de ticket no existe.', ephemeral: true });
  }

  const guild = interaction.guild;
  const user = interaction.user;

  const existing = guild.channels.cache.find(
    ch => ch.topic && ch.topic.includes(`ticketOwner:${user.id}`) && ch.topic.includes(`ticketType:${type}`)
  );

  if (existing) {
    return interaction.reply({ content: `Ya tienes un ticket de este tipo abierto en ${existing}.`, ephemeral: true });
  }

  const username = sanitizeChannelName(user.username).slice(0, 10);
  const channel = await guild.channels.create({
    name: `${data.name}-${username}`,
    type: ChannelType.GuildText,
    parent: data.categoryId,
    topic: `ticketOwner:${user.id} | ticketType:${type}`,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks
        ]
      },
      {
        id: data.roleId,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageMessages,
          PermissionFlagsBits.ManageChannels
        ]
      }
    ]
  });

  await channel.send({
    content: `<@${user.id}> tu TICKET fue creado con éxito en el canal ${channel}\n<@${user.id}>`
  });

  await channel.send({
    content: `<@${user.id}> <@&${data.roleId}>`,
    embeds: [buildTicketEmbed(user, data)],
    components: [buildTicketButtons({ claimed: false })]
  });

  if (answers.length) {
    const answersText = answers.map(([q, a]) => `**${q}**\n${a}`).join('\n\n');
    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff0000)
          .setTitle(data.title)
          .setDescription(answersText)
          .setThumbnail(config.logoUrl)
      ]
    });
  }

  return interaction.reply({
    content: `Tu ticket fue creado con éxito en el canal ${channel}`,
    ephemeral: true
  });
}

async function fetchAllMessages(channel) {
  const all = [];
  let lastId;

  while (true) {
    const options = { limit: 100 };
    if (lastId) options.before = lastId;

    const messages = await channel.messages.fetch(options);
    if (!messages.size) break;

    all.push(...messages.values());
    lastId = messages.last().id;

    if (messages.size < 100) break;
  }

  return all.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
}

function formatTranscriptMessage(msg) {
  const date = new Date(msg.createdTimestamp).toLocaleString('es-CO', { hour12: true });
  const content = msg.content?.trim() || '[sin texto]';
  return `[${date}] ${msg.author.tag}: ${content}`;
}

async function sendTranscript(channel, closerUser) {
  const messages = await fetchAllMessages(channel);
  const transcriptText = messages.map(formatTranscriptMessage).join('\n');
  const transcriptName = `transcript-${channel.name}.txt`;
  const buffer = Buffer.from(transcriptText || 'Sin mensajes', 'utf-8');
  const attachment = new AttachmentBuilder(buffer, { name: transcriptName });

  const info = getTicketInfoFromChannel(channel);
  const opener = info?.ownerId ? await client.users.fetch(info.ownerId).catch(() => null) : null;

  const transcriptChannel = await client.channels.fetch(config.transcriptChannelId).catch(() => null);

  if (transcriptChannel && transcriptChannel.isTextBased()) {
    await transcriptChannel.send({
      content: `Transcript de ${channel.name}`,
      files: [attachment]
    });

    await transcriptChannel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff0000)
          .setAuthor({ name: 'LineaRojaRp', iconURL: config.logoUrl })
          .setTitle('Ticket Closed')
          .addFields(
            { name: 'Canal', value: channel.name, inline: true },
            { name: 'Usuario', value: opener ? `<@${opener.id}>` : 'No encontrado', inline: true },
            { name: 'Cerrado por', value: `<@${closerUser.id}>`, inline: true },
            { name: 'Hora', value: new Date().toLocaleString('es-CO', { hour12: true }), inline: false }
          )
      ]
    });
  }

  if (opener) {
    const dmAttachment = new AttachmentBuilder(buffer, { name: transcriptName });

    await opener.send({
      content: `Transcript de ${channel.name}`,
      files: [dmAttachment]
    }).catch(() => null);

    await opener.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0xff0000)
          .setAuthor({ name: 'LineaRojaRp', iconURL: config.logoUrl })
          .setTitle('Ticket Closed')
          .addFields(
            { name: 'Canal', value: channel.name, inline: true },
            { name: 'Usuario', value: `<@${opener.id}>`, inline: true },
            { name: 'Cerrado por', value: `<@${closerUser.id}>`, inline: true },
            { name: 'Hora', value: new Date().toLocaleString('es-CO', { hour12: true }), inline: false }
          )
      ]
    }).catch(() => null);
  }
}

async function updateClaimEmbed(message, claimer) {
  const oldEmbed = message.embeds[0];
  if (!oldEmbed) return false;

  const desc = oldEmbed.description || '';
  if (!desc.includes('`Nadie ha asumido el ticket`')) return false;

  const updatedDesc = desc.replace(
    '**Staff**\n`Nadie ha asumido el ticket`',
    `**Staff**\n\`${claimer.tag} ha asumido el ticket\``
  );

  const newEmbed = EmbedBuilder.from(oldEmbed).setDescription(updatedDesc);

  await message.edit({
    embeds: [newEmbed],
    components: [buildTicketButtons({ claimed: true })]
  });

  return true;
}

function buildRankingEmbed() {
  const top = getTopClaimers(10);

  const description = top.length
    ? top.map((item, index) => `**${index + 1}.** <@${item.userId}> — **${item.count}** tickets`).join('\n')
    : 'Aún no hay tickets asumidos.';

  return new EmbedBuilder()
    .setColor(0xff0000)
    .setTitle('Top de tickets asumidos')
    .setDescription(description)
    .setThumbnail(config.logoUrl)
    .setFooter({ text: `${config.guildName} • Ranking Staff` });
}

async function updateRankingChannel() {
  const channel = await client.channels.fetch(config.rankingChannelId).catch(() => null);
  if (!channel || !channel.isTextBased()) return;

  const data = readJson(RANKING_FILE, {});
  const embed = buildRankingEmbed();

  if (data.messageId) {
    const msg = await channel.messages.fetch(data.messageId).catch(() => null);
    if (msg) {
      await msg.edit({ embeds: [embed] });
      return;
    }
  }

  const newMsg = await channel.send({ embeds: [embed] });
  writeJson(RANKING_FILE, { messageId: newMsg.id });
}

const commands = [
  new SlashCommandBuilder()
    .setName('panelguia')
    .setDescription('Enviar panel de tickets guía')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),

  new SlashCommandBuilder()
    .setName('panelgeneral')
    .setDescription('Enviar panel de tickets generales')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),

  new SlashCommandBuilder()
    .setName('topclaims')
    .setDescription('Actualizar y mostrar ranking de tickets asumidos')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),

  new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Crear un embed personalizado en este canal')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addStringOption(opt => opt.setName('titulo').setDescription('Título del embed').setRequired(true))
    .addStringOption(opt => opt.setName('descripcion').setDescription('Descripción del embed').setRequired(true))
    .addStringOption(opt => opt.setName('imagen').setDescription('URL de imagen grande').setRequired(false))
    .addStringOption(opt => opt.setName('thumbnail').setDescription('URL de logo a la derecha').setRequired(false))
    .addStringOption(opt => opt.setName('color').setDescription('Color HEX, ejemplo #ff0000').setRequired(false))
    .toJSON()
];

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
  console.log('Comandos registrados correctamente.');
}

client.once('clientReady', async () => {
  console.log(`Bot conectado como ${client.user.tag}`);
  ensureFile(CLAIMS_FILE, {});
  ensureFile(RANKING_FILE, {});
  await registerCommands();
  await updateRankingChannel();
});

client.on('guildMemberAdd', async member => {
  try {
    const bannerChannel = await member.guild.channels.fetch(config.bannerWelcomeChannelId).catch(() => null);
    if (bannerChannel?.isTextBased()) {
      const embed = new EmbedBuilder()
        .setAuthor({ name: 'LineaRojaRp', iconURL: config.logoUrl })
        .setTitle('¡Bienvenido!')
        .setDescription(`Hola ${member}\nBienvenido a **LineaRojaRp 🔴**`)
        .setColor(0xff0000)
        .setThumbnail(config.logoUrl)
        .setImage(config.bannerUrl);

      await bannerChannel.send({ embeds: [embed] });
    }

    const infoChannel = await member.guild.channels.fetch(config.infoWelcomeChannelId).catch(() => null);
    if (infoChannel?.isTextBased()) {
      await infoChannel.send({
        content: [
          `<:LineaRojaRp:1497376562386047087> **Bienvenido ${member}.**`,
          `*Recuerda https://discordapp.com/channels/1188377448346288158/1188388349799579658 para poder disfrutar del servidor, al tiempo te recomiendo que te informes un poco sobre nuestro servidor aca https://discordapp.com/channels/1188377448346288158/1496676450269397042 .*`,
          '',
          '-> __Nota:__ Recuerda que para entrar al servidor debes pertenecer en una **FACCION**, y aca puedes postular para alguna de ellas:',
          '- https://discordapp.com/channels/1188377448346288158/1496674973622734900'
        ].join('\n')
      });
    }
  } catch (error) {
    console.error('Error enviando bienvenida:', error);
  }
});

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'panelguia') {
        await interaction.channel.send(buildGuidePanel());
        return interaction.reply({ content: 'Panel guía enviado correctamente.', ephemeral: true });
      }

      if (interaction.commandName === 'panelgeneral') {
        await interaction.channel.send(buildGeneralPanel());
        return interaction.reply({ content: 'Panel general enviado correctamente.', ephemeral: true });
      }

      if (interaction.commandName === 'topclaims') {
        await updateRankingChannel();
        return interaction.reply({ embeds: [buildRankingEmbed()] });
      }

      if (interaction.commandName === 'embed') {
        const titulo = interaction.options.getString('titulo');
        const descripcion = interaction.options.getString('descripcion');
        const imagen = interaction.options.getString('imagen');
        const thumbnail = interaction.options.getString('thumbnail');
        const color = interaction.options.getString('color') || '#ff0000';

        const embed = new EmbedBuilder()
          .setTitle(titulo)
          .setDescription(descripcion)
          .setColor(color);

        if (imagen) embed.setImage(imagen);
        if (thumbnail) embed.setThumbnail(thumbnail);

        await interaction.channel.send({ embeds: [embed] });
        return interaction.reply({ content: 'Embed enviado correctamente.', ephemeral: true });
      }
    }

    if (interaction.isButton()) {
      if (interaction.customId === 'open_guide_staff') return interaction.showModal(buildModal('guide_staff'));
      if (interaction.customId === 'open_guide_org') return interaction.showModal(buildModal('guide_org'));
      if (interaction.customId === 'open_guide_police') return interaction.showModal(buildModal('guide_police'));

      const generalType = interaction.customId.replace('open_', '');
      if (generalTickets[generalType]) {
        return createTicket(interaction, generalType);
      }

      if (
        interaction.customId === 'ticket_claim' ||
        interaction.customId === 'ticket_transcript' ||
        interaction.customId === 'ticket_rename' ||
        interaction.customId === 'ticket_close'
      ) {
        if (!canManageTicket(interaction)) return interaction.reply(noPermission());
      }

      if (interaction.customId === 'ticket_claim') {
        const updated = await updateClaimEmbed(interaction.message, interaction.user);

        if (!updated) {
          return interaction.reply({ content: 'Este ticket ya fue asumido.', ephemeral: true });
        }

        const total = incrementClaim(interaction.user);
        await updateRankingChannel();

        return interaction.reply({
          content: `Has asumido el ticket correctamente. Ahora llevas **${total}** tickets asumidos.`,
          ephemeral: true
        });
      }

      if (interaction.customId === 'ticket_rename') {
        return interaction.showModal(buildModal('rename'));
      }

      if (interaction.customId === 'ticket_transcript') {
        await interaction.reply({ content: 'Generando transcript...', ephemeral: true });
        await sendTranscript(interaction.channel, interaction.user);
        return interaction.followUp({ content: 'Transcript enviado al canal de transcripts y al privado del usuario.', ephemeral: true });
      }

      if (interaction.customId === 'ticket_close') {
        await interaction.reply({ content: 'Cerrando ticket, enviando transcript...', ephemeral: true });
        await sendTranscript(interaction.channel, interaction.user);

        setTimeout(async () => {
          try {
            await interaction.channel.delete();
          } catch (error) {
            console.error(error);
          }
        }, 3000);

        return;
      }
    }

    if (interaction.isModalSubmit()) {
      if (interaction.customId === 'modal_rename_ticket') {
        if (!canManageTicket(interaction)) return interaction.reply(noPermission());

        const raw = interaction.fields.getTextInputValue('new_channel_name');
        const newName = sanitizeChannelName(raw);

        if (!newName) return interaction.reply({ content: 'El nombre no es válido.', ephemeral: true });

        await interaction.channel.setName(newName);
        return interaction.reply({ content: `Canal renombrado a **${newName}**.`, ephemeral: true });
      }

      const modalData = getAnswersFromModal(interaction);
      if (modalData) {
        return createTicket(interaction, modalData.type, modalData.answers);
      }
    }
  } catch (error) {
    console.error('Error en interactionCreate:', error);

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: 'Hubo un error al procesar esta acción.',
        ephemeral: true
      }).catch(() => null);
    }
  }
});

client.login(TOKEN);
