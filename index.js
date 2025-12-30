const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  PermissionsBitField
} = require("discord.js");
const fs = require("fs");

// ================================
// CLIENT
// ================================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// ================================
// CONFIG (Render utilisera ENV)
// ================================
const TOKEN = process.env.DISCORD_TOKEN;
const LOG_CHANNEL_ID = process.env.LOG_CHANNEL_ID;

// ================================
// LOG
// ================================
async function sendLog(message) {
  try {
    const channel = await client.channels.fetch(LOG_CHANNEL_ID);
    if (channel && channel.isTextBased()) {
      await channel.send(message);
    }
  } catch (e) {
    console.error("Erreur log:", e.message);
  }
}

// ================================
// READY
// ================================
client.once("ready", async () => {
  console.log("F1EC-Numeros prêt 🚦");
  await sendLog("✅ **F1EC-Numeros connecté (Render)**");
});

// ================================
// INTERACTIONS
// ================================
client.on("interactionCreate", async interaction => {

  // /choisir-numero
  if (interaction.isChatInputCommand() && interaction.commandName === "choisir-numero") {

    const data = JSON.parse(fs.readFileSync("numeros.json", "utf8"));

    const options = Object.entries(data)
      .filter(([_, v]) => v === null)
      .map(([k]) => ({
        label: `Numéro ${k}`,
        value: k
      }));

    if (!options.length) {
      return interaction.reply({ content: "❌ Aucun numéro disponible.", ephemeral: true });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId("select_numero")
      .setPlaceholder("Choisis ton numéro")
      .addOptions(options.slice(0, 25)); // limite Discord

    return interaction.reply({
      content: "🔢 Choisis ton numéro de pilote",
      components: [new ActionRowBuilder().addComponents(menu)],
      ephemeral: true
    });
  }

  // MENU
  if (interaction.isStringSelectMenu() && interaction.customId === "select_numero") {

    await interaction.deferReply({ ephemeral: true });

    const data = JSON.parse(fs.readFileSync("numeros.json", "utf8"));
    const numero = interaction.values[0];

    if (data[numero]) {
      return interaction.editReply("❌ Numéro déjà pris.");
    }

    data[numero] = interaction.user.username;
    fs.writeFileSync("numeros.json", JSON.stringify(data, null, 2));

    await interaction.member.setNickname(`[${numero}] ${interaction.user.username}`).catch(()=>{});

    await sendLog(
      `🏁 **Numéro attribué**\nPilote : ${interaction.user.username}\nNuméro : ${numero}`
    );

    return interaction.editReply(`✅ Numéro **${numero}** attribué avec succès !`);
  }

  // /liberer-numero
  if (interaction.isChatInputCommand() && interaction.commandName === "liberer-numero") {

    await interaction.deferReply({ ephemeral: true });

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageNicknames)) {
      return interaction.editReply("❌ Permission refusée.");
    }

    const numero = interaction.options.getInteger("numero");
    const data = JSON.parse(fs.readFileSync("numeros.json", "utf8"));

    if (!data[numero]) {
      return interaction.editReply("ℹ️ Numéro déjà libre.");
    }

    data[numero] = null;
    fs.writeFileSync("numeros.json", JSON.stringify(data, null, 2));

    await sendLog(`🔓 **Numéro libéré** : ${numero} (par ${interaction.user.username})`);
    return interaction.editReply(`✅ Numéro **${numero}** libéré.`);
  }
});

// ================================
// LOGIN
// ================================
client.login(TOKEN);
