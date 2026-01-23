import { TitleScene } from "./scenes/TitleScene.js";
import { WorldStoryScene } from "./scenes/WorldStoryScene.js";
import { StageSelectScene } from "./scenes/StageSelectScene.js";
import { DifficultyScene } from "./scenes/DifficultyScene.js";
import { GameScene } from "./scenes/GameScene.js";
import { PauseScene } from "./scenes/PauseScene.js";
import { ResultScene } from "./scenes/ResultScene.js";
import { SettingsScene } from "./scenes/SettingsScene.js";
import { SaveSystem } from "./systems/SaveSystem.js";
import { AudioSystem } from "./systems/AudioSystem.js";

const saveData = SaveSystem.load();
const audio = new AudioSystem(saveData.settings);

const config = {
  type: Phaser.AUTO,
  parent: "game-container",
  width: 960,
  height: 540,
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 600 },
      debug: false,
    },
  },
  scene: [
    TitleScene,
    WorldStoryScene,
    StageSelectScene,
    DifficultyScene,
    GameScene,
    PauseScene,
    ResultScene,
    SettingsScene,
  ],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
};

const game = new Phaser.Game(config);

game.registry.set("saveData", saveData);
game.registry.set("saveSystem", SaveSystem);
game.registry.set("audio", audio);
