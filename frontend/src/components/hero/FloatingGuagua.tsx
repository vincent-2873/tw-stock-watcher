"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import styles from "../../app/page.module.css";

/**
 * Hero 中央呱呱本尊 (v1.0 official)
 *
 * 設計:
 * - 取代原本的 emoji 占位
 * - 外層 .quackCircle 的呼吸 + 漣漪動畫保留(設計意圖就是給呱呱當舞台)
 * - 本元件負責「人物」部分:淡入 + 漂浮 + 搖擺 + 點擊互動
 * - 點擊整隻呱呱跳 /chat — 第一眼吸引使用者進對話
 *
 * 視覺資產:
 * - 來源 ceo-desk/assets/characters/guagua/guagua_official_v1.png(本尊)
 * - 規範:ceo-desk/context/CHARACTER_GUAGUA_V1.md
 *
 * IP 紅線:完全原創設計,不得使用任何任天堂 / 寶可夢系列元素。
 */
export function FloatingGuagua() {
  return (
    <Link
      href="/chat"
      aria-label="跟呱呱聊聊(進入對話頁)"
      className={styles.quackImageLink}
    >
      <motion.div
        className={styles.quackImage}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{
          opacity: 1,
          scale: 1,
          y: [0, -8, 0],
          rotate: [-2, 2, -2],
        }}
        transition={{
          opacity: { duration: 0.8, ease: "easeOut" },
          scale: { duration: 0.8, ease: "easeOut" },
          y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 5, repeat: Infinity, ease: "easeInOut" },
        }}
        whileHover={{ scale: 1.06, transition: { duration: 0.25 } }}
        whileTap={{ scale: 0.96 }}
        style={{ willChange: "transform", display: "inline-block" }}
      >
        <Image
          src="/characters/guagua_official_v1.png"
          alt="呱呱 — 呱呱投資招待所所主"
          width={240}
          height={240}
          priority
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            filter: "drop-shadow(0 8px 16px rgba(184, 137, 61, 0.25))",
            userSelect: "none",
            pointerEvents: "none",
          }}
        />
      </motion.div>
    </Link>
  );
}
