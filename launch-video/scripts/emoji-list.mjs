// Emoji used in the video. Twemoji is copied from @twemoji/svg; style-pack artwork is
// fetched from the same pinned commits as app/renderer-sources.json.
export const twemoji = [
  "🙏", "👍", "😂", "🎉", "✨", "🙇", "😭", "🔥", "👀", "💯", "❤️", "🥺", "🤔", "👏",
  "🤣", "😇", "🥹", "😱", "🫠", "🤯", "😎", "🥳", "😊", "🙌", "😅", "🫡",
  "✅", "📌", "📝", "📅", "🚀", "☕", "💡", "⚠️", "📎", "🔗", "💬", "📣",
  "🐱", "🐈", "😺", "😸", "😹", "😻", "😼", "😽", "🙀", "😿", "😾", "🐈‍⬛",
  "😀", "😃", "😄", "😁", "😆", "😉", "😋", "😌", "😍", "🥰", "😘", "😗",
  "😙", "😚", "🙂", "🤗", "🤩", "🤨", "😐", "😑", "😶", "🙄", "😏", "😣",
  "😥", "😮", "🤐", "😯", "😪", "😫", "🥱", "😴", "😛", "😜", "😝", "🤤",
  "😒", "😓", "😔", "😕", "🙃", "🤑", "😲", "🙁", "😖", "😞", "😟", "😤",
  "😢", "😦", "😧", "😨", "😩", "😬", "😰", "😳", "🤪", "😵", "😡", "😠",
  "🤬", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "😈", "👿", "👹", "👺", "💀",
  "👻", "👽", "🤖", "💩", "🐶", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮",
  "🍎", "🍕", "🍣", "🍩", "🍺", "⚽", "🎮", "🎧", "📷", "💻", "📱", "⏰",
];

// Fluent packs only include emoji without skin-tone variants, so scene 6 uses these.
export const styleShelf = [
  ["😂", "Face with tears of joy"],
  ["🎉", "Party popper"],
  ["✨", "Sparkles"],
  ["😭", "Loudly crying face"],
  ["🔥", "Fire"],
  ["👀", "Eyes"],
  ["💯", "Hundred points"],
  ["❤️", "Red heart"],
  ["🥺", "Pleading face"],
  ["🤔", "Thinking face"],
  ["😊", "Smiling face with smiling eyes"],
  ["🥳", "Partying face"],
  ["🚀", "Rocket"],
  ["☕", "Hot beverage"],
];

export const codepoints = (emoji) =>
  [...emoji].map((c) => c.codePointAt(0).toString(16));

// Twemoji drops FE0F unless the sequence contains ZWJ.
export const twemojiName = (emoji) => {
  const cps = codepoints(emoji);
  return (cps.includes("200d") ? cps : cps.filter((c) => c !== "fe0f")).join("-");
};
