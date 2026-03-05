import { EmbedBuilder } from 'discord.js';
import User from '../models/User.js';
import Guild from '../models/Guild.js';
import { xpForLevel } from '../utils/helpers.js';

export default {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    // When bot is mentioned
    if (message.mentions.has(client.user) && message.content.trim().startsWith(`<@${client.user.id}>`)) {
      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle('👋 Hey there!')
        .setDescription(`My prefix is **Slash Commands** — just type \`/\` to see all my commands!`)
        .addFields(
          { name: '🛡️ Moderation', value: '`/warn` `/kick` `/ban` `/timeout` `/move`', inline: false },
          { name: '📊 Utility', value: '`/stats` `/userinfo` `/rank` `/avatar` `/banner`', inline: false },
          { name: '🎮 Games', value: '`/rps` `/xo` `/dice` `/roulette` `/coinflip`', inline: false },
          { name: '⚙️ Setup', value: '`/setup` `/selfroles` `/verification` `/jail`', inline: false },
        )
        .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: `${message.guild.name}`, iconURL: message.guild.iconURL() })
        .setTimestamp();

      return message.reply({ embeds: [embed] });
    }

    // XP cooldown
    const cooldownKey = `${message.author.id}-${message.guild.id}`;
    if (client.xpCooldowns?.has(cooldownKey)) return;

    if (!client.xpCooldowns) client.xpCooldowns = new Set();
    client.xpCooldowns.add(cooldownKey);
    setTimeout(() => client.xpCooldowns.delete(cooldownKey), 60000);

    const xpGain = Math.floor(Math.random() * 10) + 5;

    const user = await User.findOneAndUpdate(
      { userId: message.author.id, guildId: message.guild.id },
      { $inc: { xp: xpGain, coins: 1 } },
      { upsert: true, new: true }
    );

    // Check level up
    const xpNeeded = xpForLevel(user.level);
    if (user.xp >= xpNeeded) {
      await User.findOneAndUpdate(
        { userId: message.author.id, guildId: message.guild.id },
        { $inc: { level: 1 }, $set: { xp: 0 } }
      );

      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle('🎉 Level Up!')
        .setDescription(`Congratulations ${message.author}! You reached **Level ${user.level + 1}**!`)
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      await message.channel.send({ embeds: [embed] });
    }
  }
};
