export const userMentionRegex: RegExp = /<!?@(\d{16,20})>/;

export const channelMentionRegex: RegExp = /<#(\d{16,20})>/

export const emojiRegex: RegExp = /<a?:(?:\w{2,32}):(\d{16,20})>/;

export const numberRegex: RegExp = /^0(?:30\d|8(00|44)|900)\d{7}$/;

export const dmNumber: RegExp = /^0900\d{7}$/;
export const guildNumber: RegExp = /^0(?:30(?:\d)|8(?:00|44))\d{7}$/;