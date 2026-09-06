import { useEffect, useState } from "react";
import screenshot from "../../../images/screenshots/emoshelf-v1-shelf.png";
import icon from "../../src-tauri/icons/128x128.png";
import { socialLinks } from "./config";
import "./style.css";

type Lang = "ja" | "en";
type Emoji = { code: string; ja: string; en: string };
const emojiList: Emoji[] = [
  { code: "1f60e", ja: "サングラス", en: "Cool" },
  { code: "2728", ja: "きらきら", en: "Sparkles" },
  { code: "1f602", ja: "うれし泣き", en: "Joy" },
  { code: "1f525", ja: "炎", en: "Fire" },
  { code: "1f979", ja: "感動", en: "Happy tears" },
  { code: "1f44f", ja: "拍手", en: "Clapping" },
  { code: "1f440", ja: "目", en: "Eyes" },
  { code: "1fae0", ja: "溶ける顔", en: "Melting" },
  { code: "1f49c", ja: "紫のハート", en: "Purple heart" },
  { code: "1f680", ja: "ロケット", en: "Rocket" },
  { code: "1f389", ja: "お祝い", en: "Party popper" },
  { code: "1f64c", ja: "ばんざい", en: "Raised hands" },
  { code: "2705", ja: "チェック", en: "Check mark" },
  { code: "1f4a1", ja: "アイデア", en: "Idea" },
  { code: "2615", ja: "コーヒー", en: "Coffee" },
  { code: "1f4bb", ja: "パソコン", en: "Laptop" },
];
const assets = import.meta.glob(
  "../../node_modules/@twemoji/svg/{1f60e,2728,1f602,1f525,1f979,1f44f,1f440,1fae0,1f49c,1f680,1f389,1f64c,2705,1f4a1,2615,1f4bb,1f44b}.svg",
  { eager: true, query: "?url", import: "default" },
) as Record<string, string>;
function EmojiArt({
  code,
  className = "",
}: {
  code: string;
  className?: string;
}) {
  return (
    <img
      className={`emoji-art ${className}`}
      src={assets[`../../node_modules/@twemoji/svg/${code}.svg`]}
      alt=""
      draggable={false}
    />
  );
}
function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <span aria-hidden="true">{diagonal ? "↗" : "→"}</span>;
}
const copy = {
  ja: {
    how: "使い方",
    faq: "よくある質問",
    soon: "Windowsのための、小さな新定番。",
    line1: "いつもの絵文字を、",
    line2: "あなたの棚に。",
    intro: "好きな絵文字を並べて、Alt + Eで呼び出す。",
    intro2: "探す時間を、伝える時間に。",
    follow: "Xで公開情報を見る",
    try: "棚を試す",
    free: "無料・オープンソース",
    local: "アカウント不要",
    note: "好きな絵文字、押してみて。",
    your: "あなたのお気に入り",
    board: ["My Shelf", "リアクション", "おしごと"],
    ready: "いつもの絵文字が、ここに。",
    selected: "選んだ絵文字",
    demo: "ブラウザでの体験デモ",
    message: "いい感じ！ありがとう",
    preview: "メッセージのプレビュー",
    reset: "リセット",
    choose: "絵文字を選ぶと、ここに入ります",
    result: "をプレビューに追加しました",
    rhythm: "並べる。呼び出す。伝わる。",
    rhythmBody: "会話のテンポに、ちょうどいい道具。",
    steps: [
      [
        "好きなものだけ。",
        "よく使う絵文字を、自分のBoardに。毎回探さなくても、いつもの場所に。",
      ],
      [
        "必要なとき、すぐ。",
        "Alt + Eで棚を呼び出す。マウスでもキーボードでも、迷わず選べる。",
      ],
      [
        "気持ちを、ひとつ。",
        "選んで、貼り付けて、会話に戻る。あなたらしいリアクションを、もっと気軽に。",
      ],
    ],
    productTag: "YOUR LITTLE EVERYDAY TOOL",
    productTitle: "小さな棚に、\nあなたらしさを。",
    productBody:
      "会話用、おしごと用、お気に入り用。自分の使い方に合わせて、絵文字の居場所を作れます。",
    features: [
      "Boardで好きな並びに",
      "日本語・英語で検索",
      "自分の画像も、棚の仲間に",
      "データは自分のPCに保存",
    ],
    actual: "実アプリの画面 / v1.0 Release Candidate",
    privacy: "あなたの棚は、あなたのPCに。",
    privacyBody:
      "アカウント登録も、クラウド同期も不要。アプリにアクセス解析は含まれません。",
    faqTitle: "ちょっと、気になること。",
    questions: [
      [
        "どのWindowsで使えますか？",
        "Windows 11のx64・ARM64に対応しています。Macやスマートフォン向けのアプリではありません。このページのデモはスマートフォンでも試せます。",
      ],
      [
        "無料で使えますか？",
        "はい。EmoShelfは無料・オープンソースのアプリです。アプリのコードはApache-2.0ライセンスで提供します。",
      ],
      [
        "Windows標準の絵文字入力と、どう違いますか？",
        "EmoShelfは、自分が繰り返し使う絵文字をBoardに並べておける「自分の棚」です。好きな並びを作り、ショートカットで呼び出して使えます。",
      ],
      [
        "入力内容や絵文字は送信されますか？",
        "アプリの棚はローカルに保存されます。このページのデモはサンプル表示のみで、入力や選択をサーバーに送信せず、クリップボードにもアクセスしません。",
      ],
      [
        "いつダウンロードできますか？",
        "現在、正式公開に向けて準備中です。署名済みインストーラーの用意ができたら、XとGitHubでお知らせします。公開日はまだ決まっていません。",
      ],
    ],
    final: "あなたの棚、もうすぐ。",
    finalBody: "毎日の「これこれ」を、もっと近くに。公開情報はXとGitHubで。",
    preparing: "公開準備中",
    pending: "リンクは公開準備中です。",
    github: "GitHubで開発を見る",
    footer: "あなたらしさを、すぐそばに。",
    skip: "本文へ移動",
  },
  en: {
    how: "How it works",
    faq: "FAQ",
    soon: "A little new favorite for Windows.",
    line1: "Your favorites.",
    line2: "Within reach.",
    intro: "Keep the emoji you love on your shelf. Press Alt + E,",
    intro2: "pick one, and get back to the conversation.",
    follow: "Follow on X",
    try: "Try the shelf",
    free: "Free & open source",
    local: "No account needed",
    note: "Go on, pick a favorite.",
    your: "YOUR FAVORITES",
    board: ["My Shelf", "Reactions", "Work"],
    ready: "A familiar place for your favorites.",
    selected: "YOUR PICK",
    demo: "Interactive browser demo",
    message: "Love it! Thank you",
    preview: "MESSAGE PREVIEW",
    reset: "Reset",
    choose: "Pick an emoji. See it here.",
    result: "added to the preview",
    rhythm: "Make it yours. Make it quick.",
    rhythmBody: "A little tool that keeps up with the conversation.",
    steps: [
      [
        "Just your favorites.",
        "Keep your go-to emoji on your own Board. Right where you left them, every time.",
      ],
      [
        "One shortcut away.",
        "Press Alt + E to open your shelf. Pick with your mouse or your keyboard.",
      ],
      [
        "A little more you.",
        "Pick, paste, and get back to it. Your kind of reaction, without the extra searching.",
      ],
    ],
    productTag: "YOUR LITTLE EVERYDAY TOOL",
    productTitle: "A little shelf.\nA lot more you.",
    productBody:
      "One Board for conversations. Another for work. Make a home for your emoji, just the way you like it.",
    features: [
      "Arrange your own Boards",
      "Search in English & Japanese",
      "Bring your own images",
      "Keep your data on your PC",
    ],
    actual: "Actual app / v1.0 Release Candidate",
    privacy: "Your shelf. Your computer.",
    privacyBody: "No account. No cloud sync required. No analytics in the app.",
    faqTitle: "A few good questions.",
    questions: [
      [
        "Which Windows versions are supported?",
        "EmoShelf supports Windows 11 on x64 and ARM64. It is not a Mac or mobile app. You can still try this browser demo on your phone.",
      ],
      [
        "Is it free?",
        "Yes. EmoShelf is free and open source. The application code is available under the Apache-2.0 license.",
      ],
      [
        "How is it different from the Windows emoji picker?",
        "EmoShelf is a personal shelf for the emoji you use again and again. Arrange them on Boards and bring them up with a shortcut.",
      ],
      [
        "Is anything I type or select sent anywhere?",
        "The app stores your shelf locally. This page only displays a sample: it does not send your selections to a server or access your clipboard.",
      ],
      [
        "When can I download it?",
        "We are preparing the official release. We will share updates on X and GitHub when signed installers are ready. There is no confirmed release date yet.",
      ],
    ],
    final: "Your shelf is almost here.",
    finalBody:
      "Your everyday favorites, a little closer. Follow along on X and GitHub.",
    preparing: "Coming soon",
    pending: "This link is being prepared.",
    github: "Explore on GitHub",
    footer: "A little closer to you.",
    skip: "Skip to content",
  },
};
function Social({
  channel,
  className = "",
  lang,
  onPending,
}: {
  channel: "x" | "github";
  className?: string;
  lang: Lang;
  onPending: () => void;
}) {
  const c = copy[lang];
  const label = channel === "x" ? c.follow : c.github;
  const content = (
    <>
      <span aria-hidden="true" className="social-symbol">
        {channel === "x" ? "𝕏" : "⌘"}
      </span>
      {label}
      <Arrow diagonal />
    </>
  );
  const url = socialLinks[channel];
  return url ? (
    <a
      className={`button ${className}`}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {content}
    </a>
  ) : (
    <button type="button" className={`button ${className}`} onClick={onPending}>
      {content}
    </button>
  );
}
export default function App() {
  const [lang, setLang] = useState<Lang>("ja");
  const [board, setBoard] = useState(0);
  const [selected, setSelected] = useState<Emoji | null>(null);
  const [notice, setNotice] = useState(false);
  const c = copy[lang];
  const visible =
    board === 0
      ? emojiList.slice(0, 12)
      : board === 1
        ? [
            emojiList[2],
            emojiList[4],
            emojiList[5],
            emojiList[7],
            emojiList[8],
            emojiList[10],
            emojiList[11],
            emojiList[0],
          ]
        : [
            emojiList[12],
            emojiList[9],
            emojiList[13],
            emojiList[14],
            emojiList[15],
            emojiList[3],
            emojiList[1],
            emojiList[5],
          ];
  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = `EmoShelf — ${lang === "ja" ? "いつもの絵文字を、あなたの棚に。" : "Your favorites. Within reach."}`;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", `${c.intro} ${c.intro2}`);
  }, [lang, c]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(false), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);
  return (
    <>
      <a className="skip" href="#main">
        {c.skip}
      </a>
      <header className="nav wrap" id="top">
        <a href="#top" className="brand" aria-label="EmoShelf">
          <img src={icon} alt="" />
          <span>
            emo<span className="brand-light">shelf</span>
            <span className="brand-dot">.</span>
          </span>
        </a>
        <nav
          aria-label={
            lang === "ja" ? "メインナビゲーション" : "Main navigation"
          }
        >
          <a href="#how">{c.how}</a>
          <a href="#faq">{c.faq}</a>
        </nav>
        <div className="nav-right">
          <fieldset className="language" aria-label="Language">
            <button
              type="button"
              lang="ja"
              aria-pressed={lang === "ja"}
              onClick={() => setLang("ja")}
            >
              JA
            </button>
            <span>/</span>
            <button
              type="button"
              lang="en"
              aria-pressed={lang === "en"}
              onClick={() => setLang("en")}
            >
              EN
            </button>
          </fieldset>
          <button
            type="button"
            className="nav-github"
            onClick={() =>
              socialLinks.github
                ? window.open(
                    socialLinks.github,
                    "_blank",
                    "noopener,noreferrer",
                  )
                : setNotice(true)
            }
          >
            GitHub <Arrow diagonal />
          </button>
        </div>
      </header>
      <main id="main">
        <section className="hero wrap">
          <div className="eyebrow">
            <span className="little-star">✦</span> {c.soon}
          </div>
          <h1>
            {c.line1}
            <br />
            <span className="headline-purple">
              {c.line2}
              <svg
                aria-hidden="true"
                viewBox="0 0 500 16"
                preserveAspectRatio="none"
              >
                <path d="M5 10 Q220 1 495 8" />
              </svg>
            </span>
          </h1>
          <p className="hero-copy">
            {c.intro}
            <br />
            {c.intro2}
          </p>
          <div className="hero-actions">
            <Social
              lang={lang}
              onPending={() => setNotice(true)}
              channel="x"
              className="primary"
            />
            <a href="#demo" className="button secondary">
              {c.try}
              <Arrow />
            </a>
          </div>
          <div className="trust">
            <span>
              <span aria-hidden="true">⊞</span> Windows 11
            </span>
            <i />
            <span>{c.free}</span>
            <i />
            <span>{c.local}</span>
          </div>
          <div className="hero-ornament ornament-one" aria-hidden="true">
            <EmojiArt code="1f44b" />
          </div>
          <div className="hero-ornament ornament-two" aria-hidden="true">
            <EmojiArt code="2728" />
          </div>
        </section>
        <section className="demo-stage wrap" id="demo" aria-label={c.demo}>
          <div className="hand-note">
            {c.note}
            <svg aria-hidden="true" viewBox="0 0 100 64">
              <path d="M88 4 C96 28 62 38 10 58 M16 42 L10 58 L28 58" />
            </svg>
          </div>
          <span className="floating-chip" aria-hidden="true">
            <EmojiArt code="1f49c" />
          </span>
          <div className="shelf">
            <div className="shelf-top">
              <span className="app-brand">
                <img src={icon} alt="" /> EmoShelf{" "}
                <span className="app-version">DEMO</span>
              </span>
              <span className="window-actions" aria-hidden="true">
                − &nbsp; □ &nbsp; ×
              </span>
            </div>
            <div className="shelf-inner">
              <div className="shelf-heading">
                <span>{c.your}</span>
                <span className="shortcut">
                  <kbd>Alt</kbd>
                  <span>+</span>
                  <kbd>E</kbd>
                </span>
              </div>
              <fieldset
                className="boards"
                aria-label={lang === "ja" ? "サンプルの棚" : "Sample Boards"}
              >
                {c.board.map((name, i) => (
                  <button
                    type="button"
                    key={name}
                    aria-pressed={board === i}
                    onClick={() => {
                      setBoard(i);
                      setSelected(null);
                    }}
                  >
                    <span aria-hidden="true">{["✦", "☺", "⌁"][i]}</span>
                    {name}
                  </button>
                ))}
              </fieldset>
              <div className="shelf-content">
                <div className="emoji-grid">
                  {visible.map((e) => (
                    <button
                      type="button"
                      key={e.code}
                      aria-label={e[lang]}
                      aria-pressed={selected?.code === e.code}
                      onClick={() => setSelected(e)}
                    >
                      <EmojiArt code={e.code} />
                      <span className="emoji-label">{e[lang]}</span>
                    </button>
                  ))}
                </div>
                <div className="pick-preview">
                  <div className="pick-halo">
                    <EmojiArt code={selected?.code ?? "1f60e"} />
                  </div>
                  <strong>{selected?.[lang] ?? "Hey, you."}</strong>
                  <span>{selected ? c.selected : c.ready}</span>
                  <span className="mini-star" aria-hidden="true">
                    ✦
                  </span>
                </div>
              </div>
            </div>
            <div className="shelf-footer">
              <span>
                <span className="status-dot" />
                {c.demo}
              </span>
              <span>
                <kbd>↵</kbd> {lang === "ja" ? "選ぶ" : "Pick"}
              </span>
            </div>
          </div>
          <div className="message-card">
            <div className="message-meta">
              <span>{c.preview}</span>
              <button type="button" onClick={() => setSelected(null)}>
                {c.reset} <span aria-hidden="true">↺</span>
              </button>
            </div>
            <div className="message-line">
              <span>{c.message}</span>
              {selected && (
                <EmojiArt
                  key={selected.code}
                  code={selected.code}
                  className="message-emoji"
                />
              )}
              <span className="cursor" aria-hidden="true" />
              <span className="message-send" aria-hidden="true">
                ↑
              </span>
            </div>
            <span className="sr-only" role="status">
              {selected ? `${selected[lang]} ${c.result}` : c.choose}
            </span>
          </div>
          <p className="demo-caption">
            {lang === "ja"
              ? "クリックで体験。実アプリでは、いつものアプリに貼り付け。"
              : "Click to try. In the app, paste right into your conversation."}
          </p>
        </section>
        <section className="how wrap section" id="how">
          <div className="section-heading">
            <span className="section-kicker">LESS SEARCHING. MORE YOU.</span>
            <h2>{c.rhythm}</h2>
            <p>{c.rhythmBody}</p>
          </div>
          <div className="steps">
            {c.steps.map(([title, body], i) => (
              <article key={title}>
                <div className={`step-art art-${i}`} aria-hidden="true">
                  {i === 0 ? (
                    <div className="mini-shelf">
                      <EmojiArt code="1f60e" />
                      <EmojiArt code="1f49c" />
                      <EmojiArt code="2728" />
                    </div>
                  ) : i === 1 ? (
                    <div className="key-pair">
                      <kbd>Alt</kbd>
                      <span>+</span>
                      <kbd>E</kbd>
                    </div>
                  ) : (
                    <div className="mini-bubble">
                      {lang === "ja" ? "いいね！" : "Love it!"}{" "}
                      <EmojiArt code="1f389" />
                    </div>
                  )}
                </div>
                <div className="step-label">
                  <span>0{i + 1}</span>
                  <h3>{title}</h3>
                </div>
                <p>{body}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="product-section">
          <div className="product wrap">
            <div className="product-copy">
              <span className="section-kicker">{c.productTag}</span>
              <h2>
                {c.productTitle.split("\n").map((line) => (
                  <span key={line}>
                    {line}
                    <br />
                  </span>
                ))}
              </h2>
              <p>{c.productBody}</p>
              <ul>
                {c.features.map((f) => (
                  <li key={f}>
                    <span aria-hidden="true">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
            <figure>
              <img
                src={screenshot}
                alt={
                  lang === "ja"
                    ? "EmoShelfの実画面。検索、My Shelf、絵文字一覧と詳細ペイン。"
                    : "EmoShelf app with search, My Shelf, an emoji grid and a detail pane."
                }
                loading="lazy"
              />
              <figcaption>{c.actual}</figcaption>
            </figure>
          </div>
        </section>
        <section className="privacy wrap">
          <span className="privacy-icon" aria-hidden="true">
            ⌂
          </span>
          <div>
            <h3>{c.privacy}</h3>
            <p>{c.privacyBody}</p>
          </div>
          <span className="local-tag">LOCAL FIRST</span>
        </section>
        <section className="faq wrap section" id="faq">
          <div>
            <span className="section-kicker">GOOD TO KNOW</span>
            <h2>{c.faqTitle}</h2>
            <span className="faq-spark" aria-hidden="true">
              ✳
            </span>
          </div>
          <div className="questions">
            {c.questions.map(([q, a]) => (
              <details key={q}>
                <summary>
                  {q}
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="closing wrap">
          <span className="release-label">
            <span className="status-dot" />
            {c.preparing}
          </span>
          <h2>{c.final}</h2>
          <p>{c.finalBody}</p>
          <div className="hero-actions">
            <Social
              lang={lang}
              onPending={() => setNotice(true)}
              channel="x"
              className="primary"
            />
            <Social
              lang={lang}
              onPending={() => setNotice(true)}
              channel="github"
              className="secondary"
            />
          </div>
          <div className="closing-emoji" aria-hidden="true">
            <EmojiArt code="1f60e" />
            <EmojiArt code="1f49c" />
            <EmojiArt code="2728" />
          </div>
        </section>
      </main>
      <footer className="wrap">
        <div className="footer-top">
          <a className="brand" href="#top">
            <img src={icon} alt="" />
            <span>
              emoshelf<span className="brand-dot">.</span>
            </span>
          </a>
          <span>{c.footer}</span>
          <span>Made for Windows. Made for you.</span>
        </div>
        <div className="footer-bottom">
          <span>
            © 2026 EmoShelf · Apache-2.0 · {lang === "ja" ? "作者" : "By"}{" "}
            <a
              href={socialLinks.author}
              target="_blank"
              rel="noopener noreferrer"
            >
              ELRdn
            </a>
          </span>
          <span>
            Emoji artwork:{" "}
            <a
              href="https://github.com/jdecked/twemoji"
              target="_blank"
              rel="noopener noreferrer"
            >
              Twemoji
            </a>{" "}
            ·{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noopener noreferrer"
            >
              CC BY 4.0
            </a>{" "}
            · {lang === "ja" ? "縮小表示のみ" : "Resized only"}
          </span>
        </div>
      </footer>
      <div className={`toast ${notice ? "visible" : ""}`} role="status">
        {notice ? c.pending : ""}
      </div>
    </>
  );
}
