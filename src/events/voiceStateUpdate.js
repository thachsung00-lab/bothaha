const { Events } = require('discord.js');
const voiceHandler = require('../handlers/voiceHandler');

module.exports = {
  name: Events.VoiceStateUpdate,
  execute(oldState, newState) {
    try {
      voiceHandler.handleVoiceState(oldState, newState);
    } catch (error) {
      console.error('[VoiceStateUpdate] Lỗi khi xử lý trạng thái voice:', error);
    }
  }
};
