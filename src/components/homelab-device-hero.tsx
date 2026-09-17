'use client';

import { SiTruenas, SiProxmox } from 'react-icons/si';
import { FiServer } from 'react-icons/fi';

/**
 * HomeLab 設備展示：Proxmox VE + VyOS、Switch、NAS (TrueNAS)
 * 使用純 CSS 藝術，取代 HomeLab 頁的 feature_image
 */
export function HomeLabDeviceHero({ ariaLabel }: { ariaLabel: string }) {
  return (
    <div
      className="homelab-device-hero -mx-4 mb-6 flex justify-center py-4 sm:-mx-12 sm:py-6 lg:-mx-20 lg:py-8 group-[.toc-open]:lg:-mx-4"
      role="img"
      aria-label={ariaLabel}
    >
      <div className="homelab-device-scene w-full max-w-full">
        <div className="homelab-rack">
          {/* Proxmox VE + VyOS Host */}
          <div className="homelab-router">
            <div className="homelab-router-body">
              <div className="homelab-router-leds">
                <span className="homelab-led homelab-led-power" aria-hidden />
                <span className="homelab-led homelab-led-wan" aria-hidden />
                <span className="homelab-led homelab-led-lan" aria-hidden />
              </div>
              <div className="homelab-router-logos">
                {/* Decorative duplicates of the hero aria-label — hidden. */}
                <SiProxmox className="homelab-proxmox-logo homelab-logo-svg" aria-hidden="true" />
                <FiServer className="homelab-router-icon homelab-logo-svg" aria-hidden="true" />
              </div>
            </div>
          </div>

          {/* 網路線 - 連接 Proxmox 與 Switch */}
          <div className="homelab-cable" aria-hidden>
            <span className="homelab-cable-line" />
          </div>

          {/* Switch */}
          <div className="homelab-switch">
            <div className="homelab-switch-body">
              <div className="homelab-switch-ports">
                {[1, 2].map((row) => (
                  <div key={row} className="homelab-port-row">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="homelab-port">
                        <span className="homelab-port-led homelab-port-led-active" aria-hidden />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 網路線 - 連接 Switch 與 NAS */}
          <div className="homelab-cable" aria-hidden>
            <span className="homelab-cable-line" />
          </div>

          {/* NAS - TrueNAS */}
          <div className="homelab-nas">
            <div className="homelab-nas-body">
              <div className="homelab-nas-drives">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="homelab-drive-slot" aria-hidden />
                ))}
              </div>
              <div className="homelab-nas-logo" aria-hidden="true">
                <SiTruenas className="homelab-truenas-logo" size={28} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
