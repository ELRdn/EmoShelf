import { Composition, Folder, Still } from "remotion";
import { FPS } from "./anim";
import { Main, MAIN_FRAMES, Readme, README_FRAMES } from "./Main";
import { Storyboard } from "./scenes/Storyboard";
import { Thumbnail } from "./scenes/Thumbnail";
import { H, Short, SHORT_FRAMES, W } from "./scenes/Vertical";

export const RemotionRoot = () => (
  <>
    <Folder name="Main">
      <Composition id="Main-JA" component={Main} durationInFrames={MAIN_FRAMES} fps={FPS} width={1920} height={1080} defaultProps={{ lang: "ja" as const }} />
      <Composition id="Main-EN" component={Main} durationInFrames={MAIN_FRAMES} fps={FPS} width={1920} height={1080} defaultProps={{ lang: "en" as const }} />
    </Folder>
    <Folder name="Short">
      <Composition id="Short-JA" component={Short} durationInFrames={SHORT_FRAMES} fps={FPS} width={W} height={H} defaultProps={{ lang: "ja" as const }} />
      <Composition id="Short-EN" component={Short} durationInFrames={SHORT_FRAMES} fps={FPS} width={W} height={H} defaultProps={{ lang: "en" as const }} />
    </Folder>
    <Folder name="Readme">
      <Composition id="Readme-JA" component={Readme} durationInFrames={README_FRAMES} fps={FPS} width={1920} height={1080} defaultProps={{ lang: "ja" as const }} />
      <Composition id="Readme-EN" component={Readme} durationInFrames={README_FRAMES} fps={FPS} width={1920} height={1080} defaultProps={{ lang: "en" as const }} />
    </Folder>
    <Folder name="Boards">
      <Still id="Thumb-JA" component={Thumbnail} width={1920} height={1080} defaultProps={{ lang: "ja" as const }} />
      <Still id="Thumb-EN" component={Thumbnail} width={1920} height={1080} defaultProps={{ lang: "en" as const }} />
      <Still id="Storyboard" component={Storyboard} width={1920} height={2800} defaultProps={{ lang: "ja" as const }} />
    </Folder>
  </>
);
