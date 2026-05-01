export type MockupDrawArea = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type MockupConfig = {
  id: string;
  name: string;
  fileUrl: string;
  drawArea: MockupDrawArea;
};

export const MOCKUP_STORAGE_KEY = "podforge-studio.mockups.v2";

export const DEFAULT_MOCKUPS: MockupConfig[] = [
  {
    id: "mockup-tshirt-blue-woman",
    name: "Blue Woman Tee",
    fileUrl: "/forge/mockups/mockup_tshirt_blue_woman.png",
    drawArea: { x: 585, y: 118, w: 520, h: 680 },
  },
  {
    id: "simple-tshirt-white",
    name: "White Tee Front",
    fileUrl: "/forge/mockups/simple_tshirt_white.png",
    drawArea: { x: 560, y: 72, w: 552, h: 804 },
  },
  {
    id: "mockup-tshirt-black-man",
    name: "Black Man Tee",
    fileUrl: "/forge/mockups/mockup_tshirt_black_man.png",
    drawArea: { x: 540, y: 108, w: 605, h: 690 },
  },
];
