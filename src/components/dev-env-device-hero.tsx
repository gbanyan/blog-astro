'use client';

import { SiArchlinux, SiUbuntu, SiLinux } from 'react-icons/si';

/**
 * Mac mini + 螢幕 3D 裝置展示
 * 使用純 CSS 3D transforms，取代開發工作環境頁的 feature_image
 */
export function DevEnvDeviceHero({ ariaLabel }: { ariaLabel: string }) {
  return (
    <div
      className="dev-env-device-hero -mx-4 mb-6 flex justify-center py-4 sm:-mx-12 sm:py-6 lg:-mx-20 lg:py-8 group-[.toc-open]:lg:-mx-4"
      role="img"
      aria-label={ariaLabel}
    >
      <div className="dev-env-device-scene">
        {/* Monitor */}
        <div className="dev-env-monitor">
          {/* Bezel */}
          <div className="dev-env-bezel">
            {/* Screen */}
            <div className="dev-env-screen">
              {/* macOS Desktop mockup */}
              <div className="dev-env-desktop">
                {/* macOS Menu bar - 半透明毛玻璃 */}
                <div className="dev-env-menubar">
                  <span className="dev-env-apple" aria-hidden>{'\uF8FF'}</span>
                  <span className="dev-env-app-name">Terminal</span>
                  <span className="dev-env-spacer" />
                  <span className="dev-env-menubar-right">
                    <span className="dev-env-menubar-icon" aria-hidden />
                    <span className="dev-env-menubar-icon" aria-hidden />
                    <span className="dev-env-menubar-icon" aria-hidden />
                    <span className="dev-env-time">14:30</span>
                  </span>
                </div>
                {/* Window - Terminal 顯示 Arch / Ubuntu / Tux 三個 Logo */}
                <div className="dev-env-window">
                  <div className="dev-env-window-titlebar">
                    <span className="dev-env-traffic-light dev-env-traffic-red" aria-hidden />
                    <span className="dev-env-traffic-light dev-env-traffic-yellow" aria-hidden />
                    <span className="dev-env-traffic-light dev-env-traffic-green" aria-hidden />
                  </div>
                  <div className="dev-env-window-content">
                    <div className="dev-env-terminal-prompt">
                      <span className="dev-env-prompt">$</span> neofetch --ascii_distro arch,ubuntu,tux
                    </div>
                    <div className="dev-env-terminal-logos">
                      {/* Decorative duplicate of the hero's aria-label — hide from the
                          accessibility tree instead of nesting img roles. */}
                      <div className="dev-env-logo-svg" aria-hidden="true">
                        <SiArchlinux className="dev-env-svg-arch" size={36} />
                      </div>
                      <div className="dev-env-logo-svg" aria-hidden="true">
                        <SiUbuntu className="dev-env-svg-ubuntu" size={36} />
                      </div>
                      <div className="dev-env-logo-svg" aria-hidden="true">
                        <SiLinux className="dev-env-svg-tux" size={36} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Monitor stand */}
          <div className="dev-env-stand" />
        </div>

        {/* Desk surface - Mac mini 與鍵盤均勻放置 */}
        <div className="dev-env-desk">
          {/* 鍵盤 - Magic Keyboard 風格，鍵帽網格 */}
          <div className="dev-env-keyboard">
            <div className="dev-env-keyboard-body">
              <div className="dev-env-keyboard-keys">
                {[14, 14, 13, 12].map((keyCount, row) => (
                  <div key={row} className="dev-env-keyboard-row">
                    {Array.from({ length: keyCount }).map((_, col) => (
                      <div key={col} className="dev-env-key" />
                    ))}
                  </div>
                ))}
                <div className="dev-env-keyboard-row dev-env-keyboard-row-space">
                  <div className="dev-env-key dev-env-key-space" />
                </div>
              </div>
            </div>
          </div>
          {/* Mac mini M4 2024 - 頂視，避免 3D 偽影 */}
          <div className="dev-env-macmini">
            <div className="dev-env-macmini-top">
              <span className="dev-env-macmini-apple" aria-hidden>{'\uF8FF'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
