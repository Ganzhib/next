import images from "./image-manifest.json";
import type { ToolCard } from "./content";

const image = (id: keyof typeof images) => images[id].webp[1].src;

export const defaultToolCards: ToolCard[] = [
  {
    id: "countdown",
    name: "下班倒计时",
    category: "Windows · 效率工具",
    description: "在桌面上看见今天的终点。轻巧的 Windows 倒计时工具，让下班时间一目了然。",
    action: "下载 Windows 版",
    href: "https://taoqi.zhongtao.me/download/%E4%B8%8B%E7%8F%AD%E5%80%92%E8%AE%A1%E6%97%B6-v1.0.0-Windows-x64.zip",
    image: image("tool-countdown"),
    alt: "下班倒计时工具插画",
    download: true,
    enabled: true,
    order: 1,
  },
  {
    id: "interview-island",
    name: "面试岛",
    category: "在线工具 · 面试准备",
    description: "把面试准备变成一场有节奏的练习。从问题梳理到表达复盘，稳稳走上岸。",
    action: "打开面试岛",
    href: "https://mianshidao.zhongtao.me",
    image: image("tool-interview"),
    alt: "面试交流与练习工具插画",
    download: false,
    enabled: true,
    order: 3,
  },
  {
    id: "moddraw",
    name: "墨构",
    category: "在线工具 · 创作表达",
    description: "快速整理想法、搭建结构，让脑中的信息更清晰地呈现出来。",
    action: "打开墨构",
    href: "https://moddraw.zhongtao.me",
    image: image("tool-diagram"),
    alt: "整理想法与搭建结构的工具插画",
    download: false,
    enabled: true,
    order: 4,
  },
  {
    id: "flowing-resume",
    name: "流萤简历",
    category: "在线工具 · 简历制作",
    description: "专注内容与排版的在线简历工具，帮助你更快完成一份干净、专业的简历。",
    action: "制作简历",
    href: "https://flowing-resume.ganzhibin.icu/zh",
    image: image("tool-resume"),
    alt: "在线简历制作工具插画",
    download: false,
    enabled: true,
    order: 2,
  },
];

export const toolIllustrationLabels: Record<string, string> = {
  "tool-countdown": "计时与下班",
  "tool-interview": "面试交流",
  "tool-diagram": "结构与图表",
  "tool-resume": "简历整理",
  "tool-writing": "写作与记录",
  "tool-dashboard": "桌面效率",
};

export function visibleTools(tools?: ToolCard[]) {
  return [...(tools ?? defaultToolCards)]
    .filter((tool) => tool.enabled)
    .sort((a, b) => a.order - b.order);
}
