import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  Home, TrendingUp, Activity, Lightbulb, BarChart3, Clock, Wind, Droplets,
  ChevronRight, ChevronLeft, Gauge, Trophy, Flame, Sparkles, TriangleAlert,
  Calendar, Wine, UtensilsCrossed, Plane, Zap, LockKeyhole, PowerOff,
  LayoutGrid, Building2, Hash, RefreshCw, Maximize2, X, ZoomOut,
  Settings, Upload, Minus, Plus, Thermometer, Package, Shield, Fan, VenetianMask, Moon, Link2, Check, Info, ChevronUp, ChevronDown, ArrowUpDown, Crosshair, MoreHorizontal, HardDrive, Pencil,
} from "lucide-react";

const APP_NAME = "AirTrace";
const APP_VERSION = "0.1.0";
// Resized/recompressed from the source artwork (1254x1254 PNG) down to a
// 320x320 WebP — the gradient shapes compress extremely well as WebP
// (~6KB vs ~70KB as PNG at the same size), so embedding it inline here
// keeps this a single self-contained file without adding a real asset
// pipeline just for one launch-time image.
const APP_LOGO = "data:image/webp;base64,UklGRuQWAABXRUJQVlA4INgWAACQZACdASpAAUABPjEYi0QiIaERGhSoIAMEsbdwulCIyg/uf5R96dXXqn45/3D9qfmQsT9N+9f9k/8v+Z+Q/hV0z5iXlH5v/fP7N+2X96////x7wf6O9gD+JfyX+//1z/Hf8L/Ff///6/TJ/o/bd+3PqD/qH9R/4H+G/f/5df6J+unuz/vv47/2D5Av5d/T/+X+enxAewT6AX7T+rj/r//b/svg1/Zv/1f5v9//oW/mP9x/5f5//IB6AHoAepf1p/sXa5/cOVq9oc4n9ofwn9l/cb8kedH486gX4z/JP8J+U35rclYAD6sf4P80eZj5svcC/Wn/Q8ZFQA/mf9j9WD+U/7P+U/Kr2y/mn9+/7P+c+Az+Yf1L/f/4D2zPaj+2nssfsT/9RSDU4aIW+TH1BD6gh9QQ+oIfUEPqCH1BD6gh9QQ+oIfUEPqCH1BD6gfvMD/23ugp5Pr+VWTgqWRVZGZRbn1BD5Gbxm6F9jhkLk5NcUEvX1K/lrpReJuzhohb5L9a0i9C1gKQixBC5w3kYNThohb5GpkvSZxP9qrL1zsNz7wuTH1BDoG1l/87t25BtBj0PBWid8n/jDU9fhtbt4S/AoTjw0zWYZY2AXQ2eXgnoWUaWtJ54Ri1ev1Oq3VrIGmGrG5msQNLwrO4JKV4PdLeyhXhurYBMB+V/LxeCrZd6M7k5bkc/dvg/DUbi/4TFNNMIlW2c01r7IihFDslZU1XGmEsC7nMvTAUB74FhuPfwKeoxVNsb0AsDxWnG7xzjNVBNvCsNZROhLweqtZfcrE2qOFn5clpvcgyTTNV1JJO9lEsOgqGthkwjYcmU+zssA0+LtXZqp9IrB6eHB3mHY8iVcEy7iALB1pmHLSgrvUvHZOGzPSbnroCDJCRrrY0mPdO+1t7tgeuha8w2qdMP8gXYBrUFJSJVP/Cz9Lknq45OGiFvkx9Mt5/IurOWp1j0/I7C6rZLXfZU8i4TnnjqKCH1BD6gf7AgCei3yRUA0j8h/MW8Ffv9Ou3ByNyfPf3iaeyW4bn1BD6gh9fp9JRbn1BD6gh9QQ+oIfUEPqCH1BD6gh9QQ+oIfUEPqCH0yAA/v/agAAAAACQn0RhoT8pKnZjHbS0w5izjZQ9O49bCPlVvf0yjdYjF/x3ivousPLcGcUuDsHg65zbPysRWbjrUWKkuXg0ZywjWcbSQWeEnSYzRfIHhRrbe75yNf9p0UEJHAlLG5XHyFxP4bni2K9a/66vOZ1/QERPGmZmcd5D9VAAYMjhAoC2/YsuqDTBOdsyFOfRx/2qOhqJlWatzB2tQg9YYTTGEStMQoCSgHAV2LqYpy08g+LFNug+sg5nWd6exPnbbQMq0ErcbhnNqlf7ohwP3ViCiUtqqxP/9OAi8dsWW3dpnlQZNbSFDqABSpdweImDOujs9RkxfxfsT86ZNvXNirfgj9nZ8e2boFVJS4woO+l+6YfIucAcSb9sx0D9iKM9McTg+zT5Ynu1anEsqUPm059R9yW3BbCOqrnmPFqtb16chz9jvPHj3LQb85s0s5ChMpD7TxuKZ2baI80Rs7S+kU9dB8Ij8LPjV39ejJ+g9DdrzX8rSF55xfs5i2J4wjcNACi57ZSmb8vZF4IwSVPbUdH9MlcSYkPwKqUWTen3CSc2zpUapKMLLy3ja/SFYIOl/tjs4qxsB+01eUoE8/3vv3ywG3Qyzic6xLblLB4A9ebiHqG9WRUsWg9v8rNO1uYL6iFWFuRn7H5v/12qjDgaY82o5+XkCJMqDT2cc2ir0pvqe6cCBTvL1dU1qfqa1Z8Qhu1eRgXw9lXS3y5MjPSYvwCEyO0f2D5/8gEJuq406Y3QSJoV39xM0V2nmipl+loXIjv8qj+DKFK9gcmvezG95Z2o9tnutZzqG8t2WCM/8KvwwpCLh8+S4Kr4g2pLqs/yLWM4W00fHd+p4V1IbS18SRcoRCDZkx+YBzuObXNr06s5Vy/HRq9Kbw/Y+Cu/6waGwcsNs70WVLs36UxAF+tcfrpJ65bvM/92eezgvVdtQxRORjB2EdNMdUQ/ZiYT9N2QB1V3ZnVy8Q41To6NFuG8oy2GQop17ChagNpYAAVzeZrfjpLm/62MfMV5F09nOhKNWylGiS2hHJe3TeCcn3Z2GfVvMm16O3fmtZHOPnDnn+QnUrKoOWnDPFeiGWkGneMd+1FUqzeC+VDEvve0evgUXMvohc9kTK3EI5C5HmTWUj2NiCUFbsCnlkzY+f1ATourx1kjc64Rk+JqWmVVRRy/nknXTbMmqHE2pz7PP3s2PM5jm9WLEUuU1Xoo7YH2mN+AAPKvkUWz3OCudwMvy4F7IcICEflqumMj1gpLHv8nWDe8ZWOFIFZjj9B2u9CA+zVPOVU9OOmaR09GGs+MQ/BPJ9B0SfXKXJdpQfYWXCuLNNmMBJxKeh337S/sBk/2ns6ITY01qQPBolrfeeOVezNMBJGP+AYdiLTivUqyJD7r1sHofSKDg74bX10PiOSqD0NV4EkVtFINmJdBdFOGcQALqbDVAt/X48Jbsqz1OnzzeANfAHhJIffVaqRrJWN1ZdQ6rvPKts9/k6J3srAUP6XDEDG0LF2EjvNEMIRvuJUc6m8KME+ry+49mhmN7ib5cJ7RxTDm10U4F51aXP1PVyLx6ygzg9/jTXwM7VEL2hGkNLhBKkTDfri6mDt8tfFyKVLtWnrtCgpIGb4PXTyRvDqvFGPZGq1RppZx/oX7VVTjHYA3guZIWjar6ih2/pEcN0bBMu+Ogo2gcJWG7tjTatc4DX+RslItnPRewaLXnGo/ncmxiY+45UvVvQRRTFVkL9CHooKaS2xpETS0TuZpt9el6MqhhKQHSpv/312dqMErFbKFfc5ctxJopBfTQFGhhaG+TKImu/jOwQ1ZWiyMa80/g79hLu74kSxV+QaQZjPr//vVU+Fzs2EZ98G4ZC6YcKGr7GlY9vN6fOR6v05GwI+2VQ4f7+b5wqCbPWk2WN2KJm+RzH+cgXqxiOzvlY2yLd374cJUcQlLz64BGoM7UmtK0FsxDyS2esRSu8JKQuT54Dn9fA/vSUAo3jn8rzsH2K4gXHFqETfx9grVJTckpckq841DkE5vKaEch/TliMMFvZIRx0XZ4zoS+AqWc/OBv0vfwL/zJd41d/znxU//C+q3cJybLJjEMpDwLepuge51LMWteA0qWWrz2iW9uFZqQZb7j691L2M05t+0tZY+eXrom2mkdn3Bf7aDrN/atLwO1zTkqIG+G1G9P0yRBPB9a/J2tapaQHnwBkwYPyZ47AXILifXlc44Vw4kk/IMHON3/NSYmvWfE1dScPJQspdjBBEh6ojaaVaAyqiImtVQppUoGfvPkYMj4qoUqH5ANGOCKoJqsM2IBh8JgeQ2OnSJ2Np9x+F21t8tZg0Y/dG8WrA0lmqaQjD0HgNInt61I+PjDW8qikZrTZtAeZojFXD+1aiK8LRS6pGXp9GhVotguWPUr4jRkNdf420504gIKyk0khi+R5m3Cb80ohhp9jkdZvzzdeqkOvLGF3p0bB7muII182mEbsG71af9KOycKFjci1Kf9cmQoL76DxrSiRgr8o4UMCLk8JQHnNY1anQlGdlVUpfh6Ar4GyUUfFJ0rUmoqI4VcT9fGfUg//6Z5efXJifF7ppcmEPkSvNgmCcy8tvlaOBVa9Gl1ijSDSyeJX3GVmEg29kGLtRTbo7tV1Ob/RmI3B8XTMv30nEk0wytf7UV+yXqgZKBYdEpC7Lb68/0BvKkn/mMx24uO82e3UN53smA4R4wiOJUg+bYsHFgfUPU4CQhWx64ZeR2TRRA+mEmWtt1ardh/yXUAReIbqWoaoDCAXrRWoNQs0gS4KnpzxN45uhxK52GrcmOvvXs/2EMm025v1YdtPn0iFqf5lbbwBb/OJWmxW8hMJgWiKMcoHgUPpTsn4ZSvJIW7hF+1bbR0a3WhNX+DtT2TbCKFrwy8a0OMwXEBOVahmnrXOnTWf++YBqRnsrje/1m0cjhI3hrQg6NqeA8RJpYONSAGVrzqfMJ+BE7ui6Mk7rzub7LQD3O4z1JzoPFWpkQ+E8uexqqBn4zrR78jcczgE5Y6F/eqJTPJPWJlv4FwNyGiSPyZPVk0kGnpLSTwNB9LT1WwIxft5+5rn2Ct2jwETsUX7rjpqlyDjg38dnFYsxYxla3iYYZCrCHfPlobkeATrlTVWsqyTm/FX1PNDYwJcK0Z+vZyBU+x/MvpvIntj6KIReOdUmeJouhOvLoMAdxaT6+ZWaaRR+YJcY9hk/xH9oiDeGxixNqmZESNdhHzUOroexQwgs3oMDdeQRTZWds+OqrLTHsJCoul5PTmB7Um8ji0AV2OaotME71v1xBm1q1cwRhzVGKfzn8ymjStsZtLC3fvhMSIiHeD535Adi77/aXOvX5Y8iso/07/gskx1UAtOOdMwBRv2C4we2ceKI5MqCu3myJI86byDtBzyMwi8K5lUDSCgz48Xcbmabc+cP+3gMHQFfJQ4BVVjrM4uuaYcsq1uVDgv/FdavGH2iDkJE5hrDKCdc/8OPSGOzjXPTNglGT0n3vMnYpBE8s5Jn1XGwsIHzDmppY1PlbCEnwNylw75+tc5q6AwiCWGrmtlOQPvGy6YFi+UEDpgLV32gwSyl6KgYDNsd+SjU9A9mXnk4Kq1PaZ4zNQdIzv2RkNE3rWxgPQOWBttIjkse34oV0ZtJv+t/999NSdCdPXIMoUgGs9KxUouczS0RYocubO4Bv9pRz0iEJgBfNHIwcYSJhigwIoHWS3BGdYWmSRygd444IB9Xmm5vESz+Al287VjffS4cLFdz28eF0yu2JrqJLzJJugHVu/QFun+MohZX60rxlFN53jixVdBOZxCg8s9HB+QLaVK7v142Br5p6s8pPRWmN/10/HbJwQg32MrZrgjbzta93B/FiwNPqTW9ruTaoE1VAlLKBbHtTbsf3wMFnjDYauEKW9v+i3TAttliAMaXVrMtR7dA97b/wR5EX6V1VR80/eCH/5NdOlHPOgURNgkPas+NOJn3vJSGCeWN+KXgq96m2LQMXBteEZbL2khKlbC2Ln8TxXXqXGwSVr4hO/frmFZeoScTEICGsSBcoubrh+XyrrnGgdNQsPntH3Cqlf9lF3+pgbisPR8+XXRibaiKXyGVo7dY9tt6qmL07/+pvo0lxuD8EwNTMxnWDC4FAEgHLHKerCMm3x+dSZPzXFN/bgnROGGn4cZ9ZCu5BvJFWk7I87eM08n5ITHMtNV6NHV1ncvzBjismD/Wt2j54l6YGSEy+DaJPk54NhJj268+/WfGaOzFQLnhSkrc/a/cERiDkyWCsHSL93XxyDCqigsOV5udqdd2cz6lCJzxgZs+/vmHTtfhndLFdjkzVTXMlYTf/SrufOlpmdZX8IbJNSFUNunHVDEmpBI7HVfv6hfaYlYIXbgjGrVYpM/7v7OaMy/QYqdsU6h+0/OW9zkUEc8LEhf7LCk+g5IrBU4phheOMQOpKoDn90kA3ZPoN8c9oH5DIH/41OQmAPMzAqf54Fz+6ZaLPUoqySmXMtZnxqOc+NX5vsihhic3Cc2QBGv2nI2H3un2ATRh3iJSsf9zKwWRTttUt4KkV2lprLSlZWHIwbLtOWMY9njqzFr8L3+us28xjJnIMPI7LOajfrW/YYYs4DJjZIpO1+TLqJG+K8vi9m77rsuvOQVYdGYl6otReBBbyenXiVR6bh8E6PBOiR4LY49YbdqABWyvk98H0U2EH4oA3/oUykbT/jkb/qWKE+88sz7ojQDlf/lNIeqsJebmO86wb7HGW9XjBWJ5XuAZAIELqvl+D7QsyPl3ywhXv15kHplkFTnyBSqR4/1xkLZJIxVAFeLd5Xvz1CsuAyViakTSUOiukixRWx7qko/bdurWAQYrUAGX0nseofdjfUL3LZl+CPKLdi8/jpOZVdbX2ztwvfc28mK+1U+BjX1qDd3BQg9KNV96ifXHLbHej5hpuFbFLDJQR+Falsxu0IYOMg9gu3l7dnyZabiDi/kYwVJqU+qjTaiDBKjbizJOYtHcbHu9KBlgsRHGiJa+fP8KBre0ZeXL6qR6U2jbe+yB9j5sUrqacpEcWUBmtMuyDU7aDJ2Fk/l/RUVM/+YwRx1eiZMy9tc9HnGhrnq4qukyOktvd0vsO+s8WW6T8SS0jZEag8G7jvNfYH9Eqb5LdPjw0pWkfpdS6jmOMd/GkSg9g5u3yO4b1gqd7Aobz9kx3yTnl3PqcqjTHlCifdJ41wRvVzDUUb0e5kydQD6Y7r02GSageSHSwwJNp5CpJ6j59yeSsTWYrQaP+E3v7xVQymj/d3VkhLTm/rjLMWQEDd7/+Yc4OIrQ68/NX38CoGupxZGYZjS8Ea+U5nJMvX1FgWMD0/nfj0meIoXp9Jr2nwgWUBLzGNdcq+2ZnBFFkMmzGmdMXg39r9OaVwFT3Cr3MiOR2Msza7uvA75WEivR3KXn55Uv5AKk7hq287mMQn83t8bQ1ZxQ4bvgUoPZwh8RbLv3WUB1MsY0heXAumNiNYXNjwjxsdIBIkcat7FBOK+z7mgi5f/mHEPPyzRLfZKrVGa5HAW/y3sNABvD2/E+SAbwMHL+ytdQmFP4FF4HbByMFedIBn9lxMcg+0dLvlhKYRGu1HbYwo8RAweUNTDRxz1efDcNITAFGisT5wPTb0jkDpqcOOqTHVxQEPlCQq0Cuz35s5xPY2sjKTf7BKKgwABw9gVpgZufcbQYMaGIqX/cTWkvazE2NiFQZ2SoxamVLrmqKG4QgRWI+rnM291+Q7/tVa/FW3z4adF5iUSzJSheajLQIyfakbFS0x534loBVj9qFp/bJWmh1uCrhITyF7e2VOU8R4HSSuD6PKbs674DBOtfsMne7XiExx8e5D9AsDSmD1WOEpMf0JQb0p+4twuuv9p88BLRU2DlkGt9T/R0ZJalmsHN/zovHyhT9uXxcfG0RnoAAppYBWZRH12YuQGVR5wnrN53bCBh+MUOvN5yI4hD2/waaL5WVtAlX0nnp/i5XF/XIw6GeZmK3V699r4Q/SGyzqqSrSVjuu73kOaEEuJV6MqYoxbkDTx7eGFEa4UJkesTihbAaSeVagIW/5NtEmG280L/4xxoX/3qT0/P8DJUhWMb4Ou+xudSe4sMIMAvGAJyWsaLVd8XASaT8nJ9U1GQe5ODZGtJz4VP/rhZqVGxwKhMc6HTNKV5tr+WcCEz7VH7A6OKy1O+3kZBAsSiM0tPS7STdlL0XiA9Du20eTOErCf9dymEgj/LBjdD3akdBZLk0SVjb5v0L2pNNgpgTfckWAA0QpjQ3r/DmlikSMfJf48bq6QG+cdawidAOBN2YTTGcLHsgEQOshsLW90M07HKwWyzBrdo1UlvJ1u8ItHDc8hciW59APjEuqSvC05MLmVTwCUTEauLKvu1x8irEGCuCyOuK7NflyBg2IrWAkBX6ts/ezTIhMHezTRsi5KYGk0AUkKBNw9IUDt/WQilv+eeoeqVgVTPfI+Q8RYVepqkTjcnqk1pugrx0//ptHlxhsTG5pKAqJ+o9INEvK+y0RLy9348DWn4xViGsvuH+NtLwi6DuB0JWaZ/GnWMJZfTRKOVx9/ui+4m9IjeoGgWoW5Mc1J2kqQxqks1p2ONYMiLW5Ta4a+r/K8GOMooWolKDBp57rjk35D3/cF0W2n7sl5T5fzD4ebqMLttmy7luAeNrFbvW7KBGuxFztRizMiFfg3h9UW7nCH3v11ecRSjIDpP+ddv8Divhp4vj+ue1fRDUWAAAAAAAAAAAAAAA";

/* Custom leak icon — cloud with escaping air streams, matching the app's
   outline-icon style (stroke-based, not filled) */
function LeakIcon({ size = 18, style, strokeWidth = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={style?.color || "currentColor"}
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
      <g transform="rotate(90 12 12)">
        <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
        <path d="M10 21l1-4" />
        <path d="M13 22.5l1.5-6.5" />
        <path d="M16 21l1-4" />
      </g>
    </svg>
  );
}

const T = { bg: "#F3F3F5", surface: "#FFFFFF", line: "#EDEDF0", ink: "#0A0A0C", muted: "#7C7C88" };
const C = { blue: "#3B6FE0", purple: "#7C4DE0", pink: "#E85C9A", orange: "#F0A23C", red: "#E5484D" };
const SEV = { good: "#22B36B", fair: "#F0A23C", bad: "#E5484D" };

/* Equipment — your machine is on fixed pressure, not auto-titrating,
   so pressure stats/copy throughout reflect that rather than assuming
   an APAP-style range */
const EQUIPMENT = {
  machine: {
    brand: "ResMed", model: "AirSense 10 Elite", serial: "23251368459", lastSynced: "29 Aug 2026 · 08:52", filterChanged: "2026-07-02",
    settingsDate: "31 Dec 2025",
    mode: "CPAP",
    epr: "Full time", eprLevel: 3,
    humidityLevel: 4,
    ramp: "Off",
    antibacterialFilter: "No",
    climateControl: "Auto",
    essentials: "Plus",
    humidifier: "On",
  },
  mask: { brand: "ResMed", model: "AirFit F40", cushionSize: "Medium", cushionChanged: "2026-08-05", lastCleaned: "2026-08-27", headgearWashed: "2026-08-14" },
  pressureMode: "fixed",
  fixedPressure: 10,
};

function status(ahi, targets) {
  if (ahi < targets.ahi * 0.4) return ["Excellent score!", "Your therapy is working really well."];
  if (ahi < targets.ahi * 0.6) return ["That's a great score!", "You're well on your way to good sleep."];
  if (ahi < targets.ahi) return ["A solid score.", "A couple of things worth keeping an eye on."];
  return ["A rougher night.", "Worth checking your mask and settings."];
}
const DEFAULT_TARGETS = { ahi: 5, leak: 24, usage: 4, compliance: 70, maskOff: 2, bedtime: 22.5 };

/* Meeting every target simultaneously (AHI at/under target, leak at/under
   target, usage at/over target, mask-off at/under target) is what
   reliably earns 100 — each missed target costs points proportionally */
/* Single source of truth for both the score number and its breakdown —
   scoreOf sums these penalties, ScoreRing's tap-reveal shows them
   individually, so the two can never drift out of sync with each other. */
function scoreBreakdown(night, targets) {
  return [
    { label: "AHI", penalty: Math.max(0, night.ahi - targets.ahi) * 6, met: night.ahi <= targets.ahi },
    { label: "Leak", penalty: Math.max(0, night.leak - targets.leak) * 1, met: night.leak <= targets.leak },
    { label: "Usage", penalty: Math.max(0, targets.usage - night.usage) * 8, met: night.usage >= targets.usage },
    { label: "Mask-off", penalty: Math.max(0, night.maskOff - targets.maskOff) * 5, met: night.maskOff <= targets.maskOff },
  ];
}
function scoreOf(night, targets) {
  if (night.noUsage) return 0;
  const total = scoreBreakdown(night, targets).reduce((s, b) => s + b.penalty, 0);
  return Math.round(Math.max(0, Math.min(100, 100 - total)));
}

function useMockData() {
  return useMemo(() => {
    const tagPool = ["alcohol", "lateMeal", "awayFromHome", "highStress", "illness"];
    const nights = [];
    const today = new Date();
    // A day or two a month with the machine untouched entirely — kept out of
    // the most recent few nights so Today's "last night" stays a normal
    // night to demo against; the gap still shows up clearly everywhere else
    // (Trends charts, Session times, Stats).
    const noUsageIdx = 3 + Math.floor(Math.random() * 22);
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const weekend = d.getDay() === 0 || d.getDay() === 6;
      const noUsage = nights.length === noUsageIdx;
      const alcohol = !noUsage && Math.random() < 0.2;
      const ahi = noUsage ? 0 : Math.max(0.2, (alcohol ? 5.4 : weekend ? 3.3 : 2.6) + (Math.random() - 0.5) * 2);
      const obstructive = noUsage ? 0 : ahi * (0.55 + Math.random() * 0.15);
      const central = noUsage ? 0 : ahi * (0.1 + Math.random() * 0.1);
      const hypopnea = noUsage ? 0 : Math.max(0, ahi - obstructive - central);
      const leak = noUsage ? 0 : Math.round(Math.max(2, 12 + (Math.random() - 0.5) * 12 + (i < 4 ? (4 - i) * 1.2 : 0)));
      const usage = noUsage ? 0 : +(Math.max(3.5, 7.2 + (Math.random() - 0.5) * 2)).toFixed(1);
      const pMin = noUsage ? 0 : +(EQUIPMENT.fixedPressure - 0.1 - Math.random() * 0.1).toFixed(1);
      const pMax = noUsage ? 0 : +(EQUIPMENT.fixedPressure + 0.1 + Math.random() * 0.1).toFixed(1);
      const p95 = noUsage ? 0 : EQUIPMENT.fixedPressure;
      const maskOff = noUsage ? 0 : (Math.random() < 0.15 ? 1 : 0);
      const sealPct = Math.max(60, 100 - leak * 1.8);
      const seal = noUsage ? null : (sealPct > 90 ? "Good" : sealPct > 75 ? "Fair" : "Poor");
      const tags = noUsage ? [] : tagPool.filter(() => Math.random() < 0.1);
      if (alcohol) tags.push("alcohol");
      const startHour = noUsage ? 22 : 22 + Math.random() * 1.5; // bedtime, 24h float — e.g. 22.75 = 10:45 PM
      nights.push({
        label: d.toLocaleDateString(undefined, { day: "2-digit", month: "short" }),
        fullLabel: d.toLocaleDateString(undefined, { day: "numeric", month: "long" }),
        date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        wd: d.toLocaleDateString(undefined, { weekday: "narrow" }),
        weekend, ahi: +ahi.toFixed(1), obstructive: +obstructive.toFixed(1), central: +central.toFixed(1), hypopnea: +hypopnea.toFixed(1),
        leak, usage, pMin, pMax, p95, maskOff, seal, tags: [...new Set(tags)], startHour, noUsage,
      });
    }
    return nights;
  }, []);
}
const TAG_LABEL = { alcohol: "Alcohol", lateMeal: "Late meal", awayFromHome: "Away from home", highStress: "High stress", illness: "Congestion/illness", lateStart: "Late start" };
const TAG_ICON = { alcohol: Wine, lateMeal: UtensilsCrossed, awayFromHome: Plane, highStress: Zap, illness: Thermometer, lateStart: Moon };
const TAG_COLOR = { alcohol: C.purple, lateMeal: C.orange, awayFromHome: C.blue, highStress: C.red, illness: C.pink, lateStart: T.muted };
const TAG_GRADIENT = {
  alcohol: `linear-gradient(135deg,${C.purple},${C.pink})`,
  lateMeal: `linear-gradient(135deg,${C.orange},${C.red})`,
  awayFromHome: `linear-gradient(135deg,${C.blue},${C.purple})`,
  highStress: `linear-gradient(135deg,${C.red},${C.orange})`,
  illness: `linear-gradient(135deg,${C.pink},${C.red})`,
  lateStart: `linear-gradient(135deg,${T.muted},${T.ink})`,
};
// Auto-detected from the machine's own data (session start vs. Target
// bedtime) — never logged by the user, always known, never part of the
// review/nag flow. Flagged separately so anywhere tags are shown can mark
// it as computed rather than something the user reported.
const AUTO_TAGS = new Set(["lateStart"]);
// Alcohol is graded (dose-dependent effect on airway muscle relaxation);
// the rest are flat yes/no — grading them wouldn't earn its complexity.
const GRADED_TAGS = { alcohol: ["light", "heavy"] };
function scoreColor(ahi, targets) { return ahi < targets.ahi * 0.6 ? SEV.good : ahi < targets.ahi ? SEV.fair : SEV.bad; }
function daysAgo(dateStr) { return Math.floor((Date.now() - new Date(dateStr)) / 86400000); }
function dueColor(days, intervalDays) {
  if (days >= intervalDays) return SEV.bad;
  if (days >= intervalDays * 0.75) return SEV.fair;
  return T.ink;
}
function isConcern(kind, night, targets) {
  if (kind === "usage") return night.usage < targets.usage;
  if (kind === "ahi") return night.ahi >= targets.ahi;
  if (kind === "leak") return night.leak >= targets.leak;
  if (kind === "seal") return night.seal === "Poor";
  if (kind === "maskOff") return night.maskOff >= targets.maskOff;
  return false;
}
function computeStreak(nights, targets) {
  let streak = 0;
  for (let i = nights.length - 1; i >= 0; i--) {
    if (nights[i].noUsage) break;
    if (nights[i].usage >= targets.usage) streak++; else break;
  }
  return streak;
}
/* The single most relevant thing to surface right now — used for
   Today's proactive banner. Insights itself shows the fuller list. */
function getPrimaryInsight(nights, targets, equipment) {
  const avg = (arr, k) => arr.reduce((s, n) => s + n[k], 0) / arr.length;
  const last = nights[nights.length - 1];
  const last4 = nights.slice(-4);
  const leakUp = last4.length >= 4 && last4.every((n, i) => i === 0 || n.leak >= last4[i - 1].leak - 1);
  const half = Math.floor(nights.length / 2);
  const firstHalf = nights.slice(0, half), secondHalf = nights.slice(half);
  const trajDiff = firstHalf.length && secondHalf.length ? Math.round(((avg(secondHalf, "ahi") - avg(firstHalf, "ahi")) / avg(firstHalf, "ahi")) * 100) : 0;
  const cushionDays = daysAgo(equipment.cushionChanged);
  const headgearDays = daysAgo(equipment.headgearWashed);
  const filterDays = daysAgo(equipment.filterChanged);

  // Tonight's own warning-triangle stats take priority — the banner should
  // never say "nothing urgent" while a triangle is visible right below it.
  // These route straight to last night's Drill-down, not the vaguer Insights tab.
  if (isConcern("ahi", last, targets)) {
    return { icon: TriangleAlert, dot: `linear-gradient(135deg,${C.orange},${C.red})`, title: "Last night's AHI was high", subtitle: `${last.ahi} events/hr — worth a look at what might have caused it`, target: "night" };
  }
  if (isConcern("usage", last, targets)) {
    return { icon: TriangleAlert, dot: `linear-gradient(135deg,${C.orange},${C.red})`, title: "Short night last night", subtitle: `Only ${last.usage}h of usage — under your ${targets.usage}-hour target`, target: "night" };
  }
  if (isConcern("leak", last, targets)) {
    return { icon: TriangleAlert, dot: `linear-gradient(135deg,${C.orange},${C.red})`, title: "High leak last night", subtitle: `${last.leak} L/min — worth checking your mask seal`, target: "night" };
  }
  if (isConcern("seal", last, targets)) {
    return { icon: TriangleAlert, dot: `linear-gradient(135deg,${C.orange},${C.red})`, title: "Mask seal rated poor last night", subtitle: "Worth checking cushion fit and headgear tension", target: "night" };
  }
  if (trajDiff > 5) {
    return { icon: TrendingUp, dot: `linear-gradient(135deg,${C.orange},${C.red})`, title: "Trending in the wrong direction", subtitle: `AHI up ${Math.abs(trajDiff)}% over this window — worth a closer look`, target: "trends" };
  }
  if (leakUp) {
    return { icon: TriangleAlert, dot: `linear-gradient(135deg,${C.orange},${C.red})`, title: "Leak trending up",
      subtitle: cushionDays > 60 ? `4 nights running — your cushion is ${cushionDays} days old, likely why` : "4 nights running — check your mask seal", target: "trends" };
  }
  // Overdue equipment — same thresholds MaintenanceRow uses to show its own triangle
  if (cushionDays >= 90) {
    return { icon: RefreshCw, dot: `linear-gradient(135deg,${C.orange},${C.red})`, title: "Cushion overdue for replacement", subtitle: `${cushionDays} days since it was last changed`, target: "equipment" };
  }
  if (headgearDays >= 14) {
    return { icon: Droplets, dot: `linear-gradient(135deg,${C.orange},${C.red})`, title: "Headgear overdue for a wash", subtitle: `${headgearDays} days since it was last washed`, target: "equipment" };
  }
  if (filterDays >= 180) {
    return { icon: Wind, dot: `linear-gradient(135deg,${C.orange},${C.red})`, title: "Filter overdue for replacement", subtitle: `${filterDays} days since it was last changed`, target: "equipment" };
  }
  if (trajDiff < -5) {
    return { icon: Trophy, dot: `linear-gradient(135deg,${C.blue},${SEV.good})`, title: "Trending in the right direction", subtitle: `AHI down ${Math.abs(trajDiff)}% over this window — keep it up`, target: "trends" };
  }
  return { icon: Sparkles, dot: `linear-gradient(135deg,${C.blue},${C.purple})`, title: "Nothing urgent right now", subtitle: "Check Insights for the full picture", target: "insights" };
}

/* ---------- Shared ---------- */
function ScoreRing({ night, targets, size = 158 }) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  if (night.noUsage) {
    return (
      <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
        <div style={{ width: "100%", height: "100%", borderRadius: "50%", border: `${size * 0.1}px dashed ${T.line}`, boxSizing: "border-box" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <PowerOff size={size * 0.22} style={{ color: T.muted }} strokeWidth={1.8} />
          <span style={{ fontSize: size * 0.07, fontWeight: 600, color: T.muted, marginTop: 6, maxWidth: size * 0.6, textAlign: "center" }}>Not used</span>
        </div>
      </div>
    );
  }
  const score = scoreOf(night, targets);
  const breakdown = scoreBreakdown(night, targets).map((b) => ({
    ...b,
    icon: b.label === "AHI" ? Activity : b.label === "Leak" ? LeakIcon : b.label === "Usage" ? Clock : PowerOff,
    color: b.label === "AHI" ? C.pink : b.label === "Leak" ? C.purple : b.label === "Usage" ? C.blue : C.orange,
  }));
  return (
    <div>
      <button onClick={() => setShowBreakdown((o) => !o)} style={{ position: "relative", width: size, height: size, margin: "0 auto", display: "block" }}>
        <div style={{ width: "100%", height: "100%", borderRadius: "50%",
          background: "conic-gradient(from -100deg, #3B6FE0 0deg, #7C4DE0 90deg, #F0A23C 200deg, #E5484D 280deg, #3B6FE0 350deg, transparent 350deg 360deg)" }} />
        <div style={{ position: "absolute", inset: size * 0.15, borderRadius: "50%", background: T.surface, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span className="font-display" style={{ fontSize: size * 0.28, fontWeight: 800, color: T.ink, lineHeight: 1 }}>{score}</span>
          <span style={{ fontSize: size * 0.07, fontWeight: 600, color: T.muted, marginTop: 4, maxWidth: size * 0.6, textAlign: "center" }}>My Score</span>
        </div>
      </button>
      {showBreakdown && (
        <div style={{ marginTop: 10 }}>
          {breakdown.map((b, i) => (
            <StatRow key={b.label} icon={b.icon} iconColor={b.color} label={b.label}
              value={b.met
                ? <Check size={18} style={{ color: SEV.good }} strokeWidth={2.5} />
                : <span style={{ color: T.ink }}>{`-${Math.round(b.penalty)} pts`}</span>}
              last={i === breakdown.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}
/* Companion ring next to the score — event-type mix for the night.
   Ring band width/radius matched to fill the same box edge-to-edge as
   ScoreRing, so the two read as the same visual size, not just the
   same pixel dimensions. */
function EventRing({ night, size = 158 }) {
  const [showLegend, setShowLegend] = useState(false);
  if (night.noUsage) {
    return (
      <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
        <div style={{ width: "100%", height: "100%", borderRadius: "50%", border: `${size * 0.1}px dashed ${T.line}`, boxSizing: "border-box" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: size * 0.065, fontWeight: 600, color: T.muted, maxWidth: size * 0.65, textAlign: "center", lineHeight: 1.3 }}>No events logged — machine wasn't used</span>
        </div>
      </div>
    );
  }
  const total = night.obstructive + night.central + night.hypopnea || 1;
  const r = 42, strokeW = 16, c = 2 * Math.PI * r;
  const segs = [
    { label: "Obstructive", v: night.obstructive, color: C.red,
      description: "Your airway is physically blocked despite effort to breathe — usually from relaxed throat muscles or anatomy. The most common event type for most people." },
    { label: "Central", v: night.central, color: C.orange,
      description: "Your brain briefly stops sending the signal to breathe — not a blockage. Can relate to altitude, certain medications, or heart conditions, and doesn't respond to mask/pressure fixes the way obstructive events do." },
    { label: "Hypopnea", v: night.hypopnea, color: C.blue,
      description: "A partial narrowing that reduces airflow without stopping it completely — often has similar effects to a full apnea but registers as less severe per event." },
  ];

  return (
    <div>
      <button onClick={() => setShowLegend((o) => !o)} style={{ position: "relative", width: size, height: size, margin: "0 auto", display: "block" }}>
        <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block", transform: "rotate(-90deg)" }}>
          <circle cx="50" cy="50" r={r} fill="none" stroke={T.bg} strokeWidth={strokeW} />
          {(() => {
            let dCum = 0;
            return segs.map((s, i) => {
              const len = (s.v / total) * c;
              const el = <circle key={i} cx="50" cy="50" r={r} fill="none" stroke={s.color} strokeWidth={strokeW} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-dCum} />;
              dCum += len;
              return el;
            });
          })()}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span className="font-display" style={{ fontSize: size * 0.28, fontWeight: 800, color: T.ink, lineHeight: 1 }}>{total.toFixed(1)}</span>
          <span style={{ fontSize: size * 0.065, fontWeight: 600, color: T.muted, marginTop: 4, maxWidth: size * 0.65, textAlign: "center", lineHeight: 1.3 }}>AHI Event Mix</span>
        </div>
      </button>
      {showLegend && (
        <div style={{ marginTop: 10 }}>
          {segs.map((s, i) => (
            <StatRow key={s.label} icon={Activity} iconColor={s.color} label={s.label} value={s.v.toFixed(1)}
              description={s.description} last={i === segs.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}
// Same ring language as EventRing, for a categorical Good/Fair/Poor split
// instead of an events-per-hour count.
function SealRing({ nights, size = 158 }) {
  const [showLegend, setShowLegend] = useState(false);
  const good = nights.filter((n) => n.seal === "Good").length;
  const fair = nights.filter((n) => n.seal === "Fair").length;
  const poor = nights.filter((n) => n.seal === "Poor").length;
  const total = good + fair + poor || 1;
  const goodPct = Math.round((good / total) * 100);
  const r = 42, strokeW = 16, c = 2 * Math.PI * r;
  const segs = [
    { label: "Good nights", v: good, color: SEV.good,
      description: "Nights your mask held a consistent seal throughout, with leak staying low and steady." },
    { label: "Fair nights", v: fair, color: SEV.fair,
      description: "Nights with some leak — not severe, but often the first sign a cushion is starting to wear or needs adjusting." },
    { label: "Poor nights", v: poor, color: SEV.bad,
      description: "Nights with a real seal problem. If this keeps climbing, check Equipment for cushion/headgear age — Trends' Leak & mask fit card shows exactly which nights." },
  ];

  return (
    <div>
      <button onClick={() => setShowLegend((o) => !o)} style={{ position: "relative", width: size, height: size, margin: "0 auto", display: "block" }}>
        <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: "block", transform: "rotate(-90deg)" }}>
          <circle cx="50" cy="50" r={r} fill="none" stroke={T.bg} strokeWidth={strokeW} />
          {(() => {
            let dCum = 0;
            return segs.map((s, i) => {
              const len = (s.v / total) * c;
              const el = <circle key={i} cx="50" cy="50" r={r} fill="none" stroke={s.color} strokeWidth={strokeW} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-dCum} />;
              dCum += len;
              return el;
            });
          })()}
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span className="font-display" style={{ fontSize: size * 0.28, fontWeight: 800, color: T.ink, lineHeight: 1 }}>{goodPct}%</span>
          <span style={{ fontSize: size * 0.065, fontWeight: 600, color: T.muted, marginTop: 4, maxWidth: size * 0.65, textAlign: "center", lineHeight: 1.3 }}>Nights, good seal</span>
        </div>
      </button>
      {showLegend && (
        <div style={{ marginTop: 10 }}>
          {segs.map((s, i) => (
            <StatRow key={s.label} icon={LockKeyhole} iconColor={s.color} label={s.label} value={`${Math.round((s.v / total) * 100)}%`}
              description={s.description} last={i === segs.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}
function StatRow({ icon: Icon, iconColor, label, value, last, delta, description, warn }) {
  const [open, setOpen] = useState(false);
  const clickable = !!description;
  return (
    <div style={{ borderBottom: last ? "none" : `1px solid ${T.line}` }}>
      <div onClick={clickable ? () => setOpen((o) => !o) : undefined}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0", height: 44, boxSizing: "border-box", cursor: clickable ? "pointer" : "default" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Icon size={18} style={{ color: iconColor }} strokeWidth={1.8} />
          <span className="font-display" style={{ fontSize: 14.5, color: T.ink }}>{label}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {delta !== undefined && <span style={{ fontSize: 12, color: T.muted }}>{delta > 0 ? "↑" : delta < 0 ? "↓" : "–"} {Math.abs(delta)}%</span>}
          {warn && <TriangleAlert size={18} style={{ color: SEV.bad }} />}
          <span className="font-display" style={{ fontSize: 18, fontWeight: 700, color: T.ink }}>{value}</span>
          {clickable && <ChevronRight size={14} style={{ color: T.muted, transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s", marginLeft: 2 }} />}
        </div>
      </div>
      {clickable && open && (
        <div style={{ paddingBottom: 14 }}>
          <p className="font-display" style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.5, color: T.muted, margin: 0 }}>{description}</p>
        </div>
      )}
    </div>
  );
}
function CardTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>{children}</div>
      {sub && <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
function NavCard({ title, subtitle, dot, icon: Icon, onClick }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 14, background: T.surface, borderRadius: 16, padding: 16, width: "100%", textAlign: "left" }}>
      <div style={{ width: 40, height: 40, borderRadius: "50%", background: dot, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={18} style={{ color: "#FFFFFF" }} strokeWidth={2} />
      </div>
      <div style={{ flex: 1 }}>
        <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>{title}</div>
        <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>{subtitle}</div>
      </div>
      {onClick && <ChevronRight size={18} style={{ color: T.muted }} />}
    </Tag>
  );
}
function IconTabRow({ tabs, active, onChange }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      {tabs.map((tb) => {
        const isActive = active === tb.key;
        return (
          <button key={tb.key} onClick={() => onChange(tb.key)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, opacity: isActive ? 1 : 0.35 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", border: `2px solid ${tb.color}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <tb.icon size={18} style={{ color: tb.color }} strokeWidth={2} />
            </div>
            <span className="font-display" style={{ fontSize: 12, fontWeight: 600, color: tb.color }}>{tb.label}</span>
          </button>
        );
      })}
    </div>
  );
}
/* Small pill segmented control — used for range toggles (Week/2wk/Month)
   and chart metric switchers */
function Segmented({ options, active, onChange }) {
  return (
    <div style={{ display: "inline-flex", background: T.bg, borderRadius: 10, padding: 3, gap: 2 }}>
      {options.map((opt) => {
        const isActive = active === opt.key;
        return (
          <button key={opt.key} onClick={() => onChange(opt.key)} className="font-display"
            style={{
              padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: isActive ? T.surface : "transparent",
              color: isActive ? T.ink : T.muted,
              boxShadow: isActive ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
            }}>
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
// Shared by FlatBarChart and SessionTimesChart so the marker can never
// visually drift between the two — same box, same icon, same size, always.
function ChartInfoButton({ show, onToggle, size = 26, iconSize = 13 }) {
  return (
    <button onClick={onToggle} style={{ width: size, height: size, borderRadius: "50%", background: show ? T.ink : T.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Info size={iconSize} style={{ color: show ? "#FFFFFF" : T.muted }} />
    </button>
  );
}
function ChartInfoOverlay({ show, onClose, title, desc, color }) {
  if (!show) return null;
  return (
    <>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, zIndex: 1 }} />
      <div onClick={onClose} style={{
        position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
        zIndex: 2, width: "80%", maxWidth: 230, boxSizing: "border-box",
        background: T.surface, border: `1.5px solid ${color}`, borderRadius: 14,
        boxShadow: "0 8px 24px rgba(0,0,0,0.16)", padding: "12px 14px", textAlign: "center", cursor: "pointer",
      }}>
        <span className="font-display" style={{ fontSize: 12, fontWeight: 700, color: T.ink }}>{title}</span>
        <span style={{ display: "block", fontSize: 11, color: T.muted, marginTop: 4, lineHeight: 1.4 }}>{desc}</span>
      </div>
    </>
  );
}
function NoUsageMarker({ isSelected, style }) {
  return (
    <div style={{
      width: "100%", height: 20, borderRadius: 6, boxSizing: "border-box",
      display: "flex", alignItems: "center", justifyContent: "center",
      outline: isSelected ? `2px solid ${T.ink}` : "none", outlineOffset: 1,
      ...style,
    }}>
      <X size={14} style={{ color: SEV.bad }} strokeWidth={3} />
    </div>
  );
}
function FlatBarChart({ data, dataKey, color, colorFn, max, height = 130, labelEvery = 1, onBarClick, markFn, selectedIdx, stack, showInfo, onCloseInfo, infoTitle, infoDesc, infoColor }) {
  // stack (optional): [{ key, color }] — every bar renders as segments
  // summing to dataKey's total instead of a single flat color. The caller
  // decides when to pass this at all (e.g. only once a night is selected),
  // so the chart itself doesn't need to know why it's showing composition.
  const m = max || Math.max(...data.map((d) => d[dataKey])) * 1.15;
  const ticks = [1, 0.75, 0.5, 0.25, 0];
  const dimOthers = selectedIdx != null;
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <div style={{ position: "relative", width: 24, height, flexShrink: 0 }}>
        {ticks.map((t) => (
          <span key={t} style={{ position: "absolute", top: `${(1 - t) * 100}%`, transform: "translateY(-50%)", fontSize: 9, color: T.muted }}>
            {Math.round(m * t)}
          </span>
        ))}
      </div>
      <div style={{ position: "relative", flex: 1, height }}>
        {ticks.map((t) => (
          <div key={t} style={{ position: "absolute", top: `${(1 - t) * 100}%`, left: 0, right: 0, borderTop: `1px dashed ${T.line}` }} />
        ))}
        <div style={{ position: "relative", display: "flex", alignItems: "flex-end", gap: data.length > 16 ? 3 : 6, height: "100%" }}>
          {data.map((d, i) => {
            const total = d[dataKey];
            const barPct = Math.min(100, (total / m) * 100);
            const isSelected = selectedIdx === i;
            if (d.noUsage) {
              return (
                <button key={i} onClick={() => onBarClick && onBarClick(i)}
                  style={{ flex: 1, minWidth: 0, position: "relative", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", background: "none", height: "100%", opacity: dimOthers && !isSelected ? 0.4 : 1 }}>
                  <NoUsageMarker isSelected={isSelected} />
                </button>
              );
            }
            return (
              <button key={i} onClick={() => onBarClick && onBarClick(i)}
                style={{ flex: 1, minWidth: 0, position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, background: "none", height: "100%", justifyContent: "flex-end", opacity: dimOthers && !isSelected ? 0.4 : 1 }}>
                {markFn && markFn(d) && (
                  <div style={{ position: "absolute", bottom: `calc(${barPct}% + 4px)`, left: "50%", transform: "translateX(-50%)", width: 6, height: 6, borderRadius: 3, background: SEV.bad }} />
                )}
                {stack ? (
                  <div style={{ width: "100%", height: `${barPct}%`, minHeight: 3, borderRadius: "3px 3px 0 0", overflow: "hidden", display: "flex", flexDirection: "column-reverse", outline: isSelected ? `2px solid ${T.ink}` : "none", outlineOffset: 1 }}>
                    {stack.map((sk) => {
                      const segPct = total ? (d[sk.key] / total) * 100 : 0;
                      return <div key={sk.key} style={{ width: "100%", height: `${segPct}%`, background: sk.color }} />;
                    })}
                  </div>
                ) : (
                  <div style={{ width: "100%", height: `${barPct}%`, background: colorFn ? colorFn(d) : color, borderRadius: "3px 3px 0 0", minHeight: 3, outline: isSelected ? `2px solid ${T.ink}` : "none", outlineOffset: 1 }} />
                )}
              </button>
            );
          })}
        </div>
        <ChartInfoOverlay show={showInfo} onClose={onCloseInfo} title={infoTitle} desc={infoDesc} color={infoColor} />
      </div>
    </div>
  );
}
function BarChartLabels({ data, labelEvery, labelWidth = 24 }) {
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
      <div style={{ width: labelWidth, flexShrink: 0 }} />
      <div style={{ position: "relative", flex: 1, height: 24 }}>
        {data.map((d, i) => {
          if (i % labelEvery !== 0) return null;
          const frac = (i + 0.5) / data.length;
          return (
            <div key={i} style={{
              position: "absolute", left: `${frac * 100}%`, top: 0,
              transform: frac < 0.06 ? "none" : frac > 0.94 ? "translateX(-100%)" : "translateX(-50%)",
              textAlign: "center", whiteSpace: "nowrap",
            }}>
              <div style={{ fontSize: 9, color: T.muted }}>{d.wd}</div>
              <div style={{ fontSize: 9, fontWeight: 600, color: T.ink }}>{d.label.split(" ")[0]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
// Vertical range bars — bedtime to wake time each night, on a fixed
// 8pm-9am clock axis (rather than a 0-based value axis like FlatBarChart)
// so the actual sleep window position and length are both visible at once.
function SessionTimesChart({ data, height = 160, onBarClick, selectedIdx, showInfo, onCloseInfo, infoTitle, infoDesc, infoColor }) {
  const domainStart = 20, domainEnd = 33; // 8pm .. 9am next day
  const span = domainEnd - domainStart;
  const ticks = [20, 24, 28, 32];
  const tickLabel = (h) => {
    const hh = ((h % 24) + 24) % 24;
    const ampm = hh < 12 ? "AM" : "PM";
    let h12 = hh % 12; if (h12 === 0) h12 = 12;
    return `${h12}${ampm}`;
  };
  const dimOthers = selectedIdx != null;
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <div style={{ position: "relative", width: 30, height, flexShrink: 0 }}>
        {ticks.map((t) => (
          <span key={t} style={{ position: "absolute", top: `${((t - domainStart) / span) * 100}%`, transform: "translateY(-50%)", fontSize: 9, color: T.muted }}>
            {tickLabel(t)}
          </span>
        ))}
      </div>
      <div style={{ position: "relative", flex: 1, height, overflow: "hidden" }}>
        {ticks.map((t) => (
          <div key={t} style={{ position: "absolute", top: `${((t - domainStart) / span) * 100}%`, left: 0, right: 0, borderTop: `1px dashed ${T.line}` }} />
        ))}
        <div style={{ position: "relative", display: "flex", gap: data.length > 16 ? 3 : 6, height: "100%" }}>
          {data.map((n, i) => {
            const rawTop = ((n.startHour - domainStart) / span) * 100;
            const rawH = ((n.usage) / span) * 100;
            const topPct = Math.max(0, Math.min(100, rawTop));
            const hPct = Math.max(0, Math.min(100 - topPct, rawTop + rawH - topPct));
            const isSelected = selectedIdx === i;
            if (n.noUsage) {
              return (
                <button key={i} onClick={() => onBarClick && onBarClick(i)} style={{ flex: 1, minWidth: 0, position: "relative", height: "100%", background: "none", opacity: dimOthers && !isSelected ? 0.4 : 1 }}>
                  <NoUsageMarker isSelected={isSelected} style={{ position: "absolute", bottom: 0, left: 0, right: 0 }} />
                </button>
              );
            }
            return (
              <button key={i} onClick={() => onBarClick && onBarClick(i)} style={{ flex: 1, minWidth: 0, position: "relative", height: "100%", background: "none", opacity: dimOthers && !isSelected ? 0.4 : 1 }}>
                <div style={{ position: "absolute", top: `${topPct}%`, height: `${hPct}%`, left: 0, right: 0, background: C.blue, borderRadius: 3, minHeight: 3, outline: isSelected ? `2px solid ${T.ink}` : "none", outlineOffset: 1 }} />
              </button>
            );
          })}
        </div>
        <ChartInfoOverlay show={showInfo} onClose={onCloseInfo} title={infoTitle} desc={infoDesc} color={infoColor} />
      </div>
    </div>
  );
}
// Row layout shared by every detail-panel's field group (Start/Finish/Length,
// Low/High/95th, etc) — three-across, label over value.
function DetailFields({ fields }) {
  return (
    <div style={{ display: "flex" }}>
      {fields.map((f) => (
        <div key={f.label} style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 3 }}>{f.label}</div>
          <div className="font-display" style={{ fontSize: 13, fontWeight: 700, color: f.color || T.ink }}>{f.value}</div>
        </div>
      ))}
    </div>
  );
}
// The "jump to Night View" exit from every expand-in-place panel — since
// tapping a bar now shows a breakdown in place rather than navigating away,
// this is the one deliberate way back to the full night, everywhere a panel
// can open.
function ViewNightButton({ onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%",
      marginTop: 12, height: 40, borderRadius: 12, background: T.surface,
    }}>
      <Moon size={14} style={{ color: T.ink }} />
      <span className="font-display" style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>View night detail</span>
      <ChevronRight size={13} style={{ color: T.muted }} />
    </button>
  );
}
// Event-type rows shared between this panel and (via key/color) anywhere
// else obstructive/central/hypopnea needs consistent coloring.
const AHI_BREAKDOWN = [
  { key: "obstructive", label: "Obstructive", color: C.red,
    description: "Your airway is physically blocked despite effort to breathe — usually from relaxed throat muscles or anatomy. The most common event type for most people." },
  { key: "central", label: "Central", color: C.orange,
    description: "Your brain briefly stops sending the signal to breathe — not a blockage. Can relate to altitude, certain medications, or heart conditions, and doesn't respond to mask/pressure fixes the way obstructive events do." },
  { key: "hypopnea", label: "Hypopnea", color: C.blue,
    description: "A partial narrowing that reduces airflow without stopping it completely — often has similar effects to a full apnea but registers as less severe per event." },
];
// Expanding detail panel under the Trends bar charts — shown in place of
// navigating to the night, so a tap gives a quick breakdown without leaving
// Trends. Content is metric-specific: each tab surfaces the numbers a flat
// bar can't show on its own. "View night detail" is the deliberate way to
// still reach the full Night View for that date.
function NightDetailPanel({ night, metric, targets, onViewNight, activeEventType, onSelectEventType }) {
  if (night.noUsage) {
    return (
      <div style={{ background: T.bg, borderRadius: 14, padding: 14, marginTop: 12 }}>
        <div className="font-display" style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 6 }}>{night.fullLabel}</div>
        <div style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.4 }}>Machine wasn't used this night — no data was recorded.</div>
      </div>
    );
  }
  // Events/Score/Usage all show a breakdown of parts, but unlike the
  // rings (where the total sits fixed in the center regardless of the
  // breakdown), this panel's breakdown was the whole content — so the
  // number the bar itself represents never actually appeared anywhere.
  // Leak and Pressure don't need this: their own fields already state
  // the bar's value directly ("Leak rate", "High").
  const headerTotal = metric === "ahi" ? { label: "AHI", value: night.ahi.toFixed(1) }
    : metric === "score" ? { label: "Score", value: night.score }
    : metric === "usage" ? { label: "Usage", value: `${night.usage}h` }
    : null;
  return (
    <div style={{ background: T.bg, borderRadius: 14, padding: 14, marginTop: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 10 }}>
        <span className="font-display" style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{night.fullLabel}</span>
        {headerTotal && (
          <span className="font-display" style={{ fontSize: 13, color: T.ink }}>
            {headerTotal.label} <span style={{ fontWeight: 800 }}>{headerTotal.value}</span>
          </span>
        )}
      </div>

      {metric === "ahi" && (
        <>
          {AHI_BREAKDOWN.map((s, i) => {
            const isActive = activeEventType === s.key;
            return (
              <div key={s.key} style={{ borderBottom: i < AHI_BREAKDOWN.length - 1 ? `1px solid ${T.line}` : "none" }}>
                <button onClick={() => onSelectEventType && onSelectEventType(isActive ? null : s.key)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "6px 0", background: "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 5, background: s.color, flexShrink: 0 }} />
                    <span className="font-display" style={{ fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? T.ink : T.muted }}>{s.label}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span className="font-display" style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{night[s.key].toFixed(1)}</span>
                    <ChevronRight size={12} style={{ color: T.muted, transform: isActive ? "rotate(90deg)" : "none" }} />
                  </div>
                </button>
                {isActive && (
                  <div style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.4, paddingBottom: 8 }}>{s.description}</div>
                )}
              </div>
            );
          })}
          {night.tags.length > 0 && (
            <div style={{ fontSize: 11, color: T.muted, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.line}` }}>
              Tagged: {night.tags.map((tk) => TAG_LABEL[tk]).join(", ")}
            </div>
          )}
        </>
      )}

      {metric === "leak" && (
        <DetailFields fields={[
          { label: "Leak rate", value: `${night.leak} L/min` },
          { label: "Mask seal", value: night.seal, color: night.seal === "Poor" ? SEV.bad : undefined },
          { label: "Vs. target", value: night.leak <= targets.leak ? "Under" : `+${night.leak - targets.leak} L/min`, color: night.leak <= targets.leak ? SEV.good : SEV.bad },
        ]} />
      )}

      {metric === "usage" && (
        <DetailFields fields={[
          { label: "Start", value: formatClock(night.startHour) },
          { label: "Finish", value: formatClock(night.startHour + night.usage) },
          { label: "Mask off", value: night.maskOff },
        ]} />
      )}

      {metric === "pMax" && (
        <DetailFields fields={[
          { label: "Low", value: `${night.pMin} cmH₂O` },
          { label: "High", value: `${night.pMax} cmH₂O` },
          { label: "95th %ile", value: `${night.p95} cmH₂O` },
        ]} />
      )}

      {metric === "score" && scoreBreakdown(night, targets).map((b, i, arr) => (
        <div key={b.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: i < arr.length - 1 ? `1px solid ${T.line}` : "none" }}>
          <span className="font-display" style={{ fontSize: 12, fontWeight: 500, color: T.muted }}>{b.label}</span>
          {b.met
            ? <Check size={16} style={{ color: SEV.good }} strokeWidth={2.5} />
            : <span className="font-display" style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{`-${Math.round(b.penalty)} pts`}</span>}
        </div>
      ))}

      <ViewNightButton onClick={onViewNight} />
    </div>
  );
}
// Session times gets its own panel (separate chart, separate selection
// state) but shares the field-row layout and the same "View night detail"
// exit as NightDetailPanel above.
function SessionDetailPanel({ night, onViewNight }) {
  if (night.noUsage) {
    return (
      <div style={{ background: T.bg, borderRadius: 14, padding: 14, marginTop: 12 }}>
        <div className="font-display" style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 6 }}>{night.fullLabel}</div>
        <div style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.4 }}>Machine wasn't used this night — no session to show.</div>
      </div>
    );
  }
  return (
    <div style={{ background: T.bg, borderRadius: 14, padding: 14, marginTop: 12 }}>
      <div className="font-display" style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 10 }}>{night.fullLabel}</div>
      <DetailFields fields={[
        { label: "Start", value: formatClock(night.startHour) },
        { label: "Finish", value: formatClock(night.startHour + night.usage) },
        { label: "Length", value: `${night.usage}h` },
      ]} />
      <ViewNightButton onClick={onViewNight} />
    </div>
  );
}
function MiniDots({ nights, targets, onSelect, allNights }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 5 }}>
        {nights.map((n, i) => (
          <button key={i} onClick={onSelect ? () => onSelect(allNights.indexOf(n)) : undefined}
            style={{
              flex: 1, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", cursor: onSelect ? "pointer" : "default",
              background: n.noUsage ? T.bg : scoreColor(n.ahi, targets),
              border: n.noUsage ? `1.5px dashed ${T.muted}` : "none", boxSizing: "border-box",
            }}>
            <span className="font-display" style={{ fontSize: 13, fontWeight: 700, color: n.noUsage ? T.muted : "#FFFFFF" }}>{n.wd}</span>
          </button>
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 14, flexWrap: "wrap" }}>
        {[["Good", SEV.good], ["Fair", SEV.fair], ["Rough", SEV.bad]].map(([label, c]) => (
          <span key={label} className="font-display" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: T.ink }}>
            <span style={{ width: 9, height: 9, borderRadius: 5, background: c }} />{label}
          </span>
        ))}
        <span className="font-display" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: T.ink }}>
          <span style={{ width: 9, height: 9, borderRadius: 5, border: `1.5px dashed ${T.muted}`, boxSizing: "border-box" }} />Not used
        </span>
      </div>
    </div>
  );
}

/* ---------- Today ---------- */
function TodayScreen({ nights, onNavigate, onSelectNight, targets, equipment, untaggedDates, onOpenTagEntry }) {
  const last = nights[nights.length - 1];
  const prev = nights[nights.length - 2];
  const week = nights.slice(-7);
  const streak = computeStreak(nights, targets);
  const insight = getPrimaryInsight(nights, targets, equipment);
  const pctDelta = (curr, prevVal) => (prevVal ? Math.round(((curr - prevVal) / prevVal) * 100) : undefined);
  const goToInsight = () => (insight.target === "night" ? onSelectNight(nights.length - 1) : onNavigate(insight.target));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <NavCard icon={insight.icon} dot={insight.dot} title={insight.title} subtitle={insight.subtitle} onClick={goToInsight} />

      <div style={{ background: T.surface, borderRadius: 22, padding: "28px 20px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <ScoreRing night={last} targets={targets} size={140} />
          </div>
          <div style={{ flex: 1 }}>
            <EventRing night={last} size={140} />
          </div>
        </div>
        <div style={{ marginTop: 24 }}>
          {prev && <div className="font-display" style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 4, textAlign: "right" }}>Change vs. last night</div>}
          <StatRow icon={Clock} iconColor={C.blue} label="Usage" value={`${last.usage}h`} warn={isConcern("usage", last, targets)} delta={prev ? pctDelta(last.usage, prev.usage) : undefined} />
          <StatRow icon={Activity} iconColor={C.pink} label="Events/hr" value={last.ahi} warn={isConcern("ahi", last, targets)} delta={prev ? pctDelta(last.ahi, prev.ahi) : undefined} />
          <StatRow icon={LeakIcon} iconColor={C.purple} label="Leak" value={`${last.leak} L/min`} warn={isConcern("leak", last, targets)} delta={prev ? pctDelta(last.leak, prev.leak) : undefined}
            description="Air escaping around the mask edge rather than through it. Under ~24 L/min is generally considered an acceptable seal." />
          <StatRow icon={Gauge} iconColor={C.orange} label="Pressure" value={`${EQUIPMENT.fixedPressure} cmH₂O`}
            description={`Your machine is set to a fixed pressure of ${EQUIPMENT.fixedPressure} cmH₂O rather than auto-adjusting. This confirms it held steady overnight.`} />
          <StatRow icon={LockKeyhole} iconColor={C.pink} label="Mask seal" value={last.seal} warn={isConcern("seal", last, targets)}
            description="A rating of how consistently your mask held its seal overnight. Poor seals usually show up as a rising leak rate — check the Leak stat above alongside this." />
          <StatRow icon={PowerOff} iconColor={T.muted} label="Mask off events" value={last.maskOff} warn={isConcern("maskOff", last, targets)} last />
        </div>
        <button onClick={() => onSelectNight(nights.length - 1)} style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%",
          marginTop: 16, height: 44, borderRadius: 14, background: T.bg,
        }}>
          <Moon size={15} style={{ color: T.ink }} />
          <span className="font-display" style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>View full night detail</span>
          <ChevronRight size={14} style={{ color: T.muted }} />
        </button>
      </div>

      {untaggedDates.length > 0 && (
        <NavCard icon={Pencil} dot={untaggedDates.length > 1 ? `linear-gradient(135deg,${C.orange},${C.red})` : `linear-gradient(135deg,${C.blue},${C.purple})`}
          title={untaggedDates.length === 1 ? "Tag last night" : `${untaggedDates.length} nights untagged`}
          subtitle={untaggedDates.length === 1 ? "What happened? Takes a few seconds" : "Catch up before you forget what happened"}
          onClick={() => onOpenTagEntry(untaggedDates[0])} />
      )}

      <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
        <CardTitle sub="Tap a night for detail">This week</CardTitle>
        <MiniDots nights={week} allNights={nights} targets={targets} onSelect={onSelectNight} />
      </div>

      <NavCard icon={Sparkles} dot={`linear-gradient(135deg,${C.blue},${C.purple})`} title="Tag correlation" subtitle="See what's actually driving your AHI" onClick={() => onNavigate("stats")} />
      <NavCard icon={Flame} dot={`linear-gradient(135deg,${C.orange},${C.red})`} title={streak > 0 ? `${streak}-night streak` : "No active streak"}
        subtitle={streak > 0 ? "Consistency is the biggest lever you have" : `${targets.usage}+ hours is what builds a streak — tonight's a good night to start one`} onClick={() => onNavigate("trends")} />
    </div>
  );
}

/* ---------- Trends ---------- */
function TrendsScreen({ nights, onSelectNight, targets }) {
  const [range, setRange] = useState("month");
  const [metric, setMetric] = useState("ahi");
  const [chartDetailIdx, setChartDetailIdx] = useState(null);
  const [sessionDetailIdx, setSessionDetailIdx] = useState(null);
  const [eventType, setEventType] = useState(null); // drill-down within the Events breakdown: null = full stack, else one type
  const [showChartInfo, setShowChartInfo] = useState(false);
  const [showSessionInfo, setShowSessionInfo] = useState(false);
  // Bar indices are only meaningful for the current range/metric's data
  // array — a stale index would otherwise point at the wrong night (or
  // nothing) the moment either changes, so both panels close instead.
  useEffect(() => { setChartDetailIdx(null); setSessionDetailIdx(null); }, [range]);
  useEffect(() => { setChartDetailIdx(null); setShowChartInfo(false); }, [metric]);
  // The type drill-down only makes sense while a night's breakdown is open —
  // closing the breakdown (whichever way) always clears it too, so
  // re-opening a breakdown never starts already drilled into a type.
  useEffect(() => { if (chartDetailIdx === null) setEventType(null); }, [chartDetailIdx]);
  useEffect(() => { setShowChartInfo(false); }, [eventType]);
  const rangeDays = range === "week" ? 7 : range === "2weeks" ? 14 : 30;
  const rawData = nights.slice(-rangeDays);
  const data = rawData.map((n) => ({ ...n, score: scoreOf(n, targets) }));
  const labelEvery = rangeDays <= 7 ? 1 : rangeDays <= 14 ? 2 : 5;
  const prevPeriod = nights.slice(-rangeDays * 2, -rangeDays);
  const periodLabel = range === "week" ? "week" : range === "2weeks" ? "2 weeks" : "month";
  const avg = (arr, k) => arr.reduce((s, n) => s + n[k], 0) / arr.length;
  // avgUsed skips no-usage nights for metrics that don't exist without a
  // session (AHI, leak, pressure) — their zeroed fields would otherwise
  // drag a physiological average down as if that were a real great reading.
  // Usage itself stays on plain avg: 0 hours on a skipped night is real
  // compliance signal, not a gap to paper over.
  const avgUsed = (arr, k) => {
    const used = arr.filter((n) => !n.noUsage);
    return used.length ? used.reduce((s, n) => s + n[k], 0) / used.length : 0;
  };
  const pct = (a, b) => Math.round(((a - b) / b) * 100);
  const compliance = Math.round((data.filter((n) => n.usage >= targets.usage).length / data.length) * 100);
  const noUsageCount = data.filter((n) => n.noUsage).length;
  // best/worst are picked only among nights actually used — a no-usage
  // night's zeroed AHI would otherwise win "best night" trivially every
  // time it appears. Index lookup stays reference-based (data.indexOf),
  // same reason as the comment below: data's entries are spread copies.
  const usedNights = data.filter((n) => !n.noUsage);
  const best = usedNights.length ? usedNights.reduce((a, b) => (b.ahi < a.ahi ? b : a)) : null;
  const worst = usedNights.length ? usedNights.reduce((a, b) => (b.ahi > a.ahi ? b : a)) : null;
  // best/worst need an index into rawData/nights, not just the data object —
  // data's entries are spread copies (for the added score field), so they're
  // never reference-equal to anything in nights and nights.indexOf(best)
  // would silently fail to find them.
  const bestIdx = best ? data.indexOf(best) : -1;
  const worstIdx = worst ? data.indexOf(worst) : -1;

  const half = Math.floor(data.length / 2);
  const firstHalf = data.slice(0, half), secondHalf = data.slice(half);
  const firstHalfAhi = avgUsed(firstHalf, "ahi"), secondHalfAhi = avgUsed(secondHalf, "ahi");
  const summaryDiff = firstHalf.length && secondHalf.length && firstHalfAhi ? Math.round(((secondHalfAhi - firstHalfAhi) / firstHalfAhi) * 100) : 0;
  // A fixed ±8% threshold is fine comparing two 15-night halves (Month
  // view), but the same threshold on two 3-4 night halves (Week view) lets
  // ordinary night-to-night noise masquerade as a confident trend claim —
  // there's no way to tell "one rough night in a tiny sample" apart from
  // an actual drift at that size. Below a minimum half-size, say so
  // honestly instead of guessing, same pattern as the "Not enough history
  // yet" fallback already used for the previous-period comparison below.
  const MIN_HALF_FOR_TREND = 6;
  const summary = half < MIN_HALF_FOR_TREND
    ? `Not enough nights in this range to call a clear trend — ${range === "week" ? "try 2 Weeks or Month" : "try Month"} for a steadier read.`
    : summaryDiff > 8
    ? `AHI has risen ${Math.abs(summaryDiff)}% across this period — worth a closer look.`
    : summaryDiff < -8
    ? `AHI has improved ${Math.abs(summaryDiff)}% across this period — whatever's changed, it's working.`
    : "A steady period overall, no real drift either way.";

  const wkLeakAvg = avgUsed(data, "leak"), wkUsageAvg = avg(data, "usage");

  const metricTabs = [
    { key: "ahi", label: "Events", color: C.pink, icon: Activity, max: 10,
      desc: "Apnea and hypopnea events per hour of use, split into Obstructive, Central, and Hypopnea. Lower is better — most targets sit under 5." },
    { key: "leak", label: "Leak", color: C.purple, icon: LeakIcon, max: 30,
      desc: "How much air escaped around your mask each night, in litres per minute. A poor mask seal flag means the fit itself was the likely cause." },
    { key: "usage", label: "Usage", color: C.blue, icon: Clock, max: 10,
      desc: "Hours the machine ran each night, from mask-on to mask-off. Consistent, longer sessions give therapy more chance to actually work." },
    { key: "pMax", label: "Pressure", color: C.orange, icon: Gauge, max: 16,
      desc: "The pressure range delivered overnight, including the 95th percentile — roughly the level needed for all but the highest 5% of the night." },
    { key: "score", label: "Score", color: SEV.good, icon: Trophy, max: 100,
      desc: "A single number combining events, leak, usage and mask seal against your targets, out of 100." },
  ];
  const active = metricTabs.find((tb) => tb.key === metric);
  const viewNight = (i) => onSelectNight(nights.indexOf(rawData[i]));
  const handleChartBarClick = (i) => setChartDetailIdx((cur) => (cur === i ? null : i));
  const handleSessionBarClick = (i) => setSessionDetailIdx((cur) => (cur === i ? null : i));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "center" }}>
        <Segmented options={[{ key: "week", label: "Week" }, { key: "2weeks", label: "2 Weeks" }, { key: "month", label: "Month" }]} active={range} onChange={setRange} />
      </div>

      <div style={{ background: T.surface, borderRadius: 16, padding: 16 }}>
        <div className="font-display" style={{ fontSize: 14, fontWeight: 700, color: T.ink, lineHeight: 1.4 }}>{summary}</div>
      </div>

      {best && worst ? (
        <div style={{ display: "flex", gap: 12 }}>
          <button onClick={() => viewNight(bestIdx)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "stretch", background: T.surface, borderRadius: 16, padding: 16, textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>Best night</div>
              <ChevronRight size={15} style={{ color: T.muted, flexShrink: 0 }} />
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginTop: 12 }}>
              <span className="font-display" style={{ fontSize: 24, fontWeight: 800, color: T.ink }}>{best.ahi}</span>
              <span style={{ fontSize: 12, color: T.muted }}>AHI</span>
            </div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{best.label}</div>
            {best.tags.length > 0 && (
              <div style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>{best.tags.map((tk) => TAG_LABEL[tk]).join(", ")}</div>
            )}
          </button>
          <button onClick={() => viewNight(worstIdx)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "stretch", background: T.surface, borderRadius: 16, padding: 16, textAlign: "left" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>Worst night</div>
              <ChevronRight size={15} style={{ color: T.muted, flexShrink: 0 }} />
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 5, marginTop: 12 }}>
              <span className="font-display" style={{ fontSize: 24, fontWeight: 800, color: T.ink }}>{worst.ahi}</span>
              <span style={{ fontSize: 12, color: T.muted }}>AHI</span>
            </div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{worst.label}</div>
            {worst.tags.length > 0 && (
              <div style={{ fontSize: 11, color: T.muted, marginTop: 6 }}>{worst.tags.map((tk) => TAG_LABEL[tk]).join(", ")}</div>
            )}
          </button>
        </div>
      ) : (
        <div style={{ background: T.surface, borderRadius: 16, padding: 16, textAlign: "center" }}>
          <span style={{ fontSize: 12.5, color: T.muted }}>No nights used this {periodLabel} yet.</span>
        </div>
      )}

      <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
        <IconTabRow tabs={metricTabs} active={metric} onChange={setMetric} />
        <div style={{ marginTop: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {metric === "ahi" && eventType && (
                <button onClick={() => setEventType(null)} style={{ display: "flex", alignItems: "center", padding: 0, marginRight: 2, background: "none" }}>
                  <ChevronLeft size={16} style={{ color: T.muted }} />
                </button>
              )}
              <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>
                {metric === "ahi" && eventType ? AHI_BREAKDOWN.find((s) => s.key === eventType).label : active.label} — {rangeDays} nights
              </div>
            </div>
            <ChartInfoButton show={showChartInfo} onToggle={() => setShowChartInfo((s) => !s)} />
          </div>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 14 }}>
            Tap a bar for a breakdown{metric === "leak" && " · Colored by how close to target, flagged nights had a poor mask seal"}
          </div>
          <FlatBarChart data={data}
            dataKey={metric === "ahi" && eventType ? eventType : metric}
            color={metric === "ahi" && eventType ? AHI_BREAKDOWN.find((s) => s.key === eventType).color : active.color}
            max={metric === "ahi" && eventType ? undefined : active.max}
            labelEvery={labelEvery}
            onBarClick={handleChartBarClick} selectedIdx={chartDetailIdx}
            stack={metric === "ahi" && chartDetailIdx != null && !eventType ? AHI_BREAKDOWN : undefined}
            colorFn={metric === "leak" ? (d) => d.leak >= targets.leak ? SEV.bad : d.leak >= targets.leak * 0.75 ? SEV.fair : SEV.good : undefined}
            markFn={metric === "leak" ? (d) => d.seal === "Poor" : undefined}
            showInfo={showChartInfo} onCloseInfo={() => setShowChartInfo(false)}
            infoTitle={metric === "ahi" && eventType ? AHI_BREAKDOWN.find((s) => s.key === eventType).label : active.label}
            infoDesc={metric === "ahi" && eventType ? AHI_BREAKDOWN.find((s) => s.key === eventType).description : active.desc}
            infoColor={metric === "ahi" && eventType ? AHI_BREAKDOWN.find((s) => s.key === eventType).color : active.color} />
          <BarChartLabels data={data} labelEvery={labelEvery} />
          {metric === "leak" && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: 3, background: SEV.bad, flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: T.muted }}>Poor mask seal that night</span>
            </div>
          )}
          {chartDetailIdx != null && (
            <NightDetailPanel night={data[chartDetailIdx]} metric={metric} targets={targets}
              activeEventType={eventType} onSelectEventType={setEventType}
              onViewNight={() => viewNight(chartDetailIdx)} />
          )}
        </div>
      </div>

      <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
          <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>Session times</div>
          <ChartInfoButton show={showSessionInfo} onToggle={() => setShowSessionInfo((s) => !s)} />
        </div>
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 14 }}>Tap a night for start, finish &amp; length</div>
        <SessionTimesChart data={data} onBarClick={handleSessionBarClick} selectedIdx={sessionDetailIdx}
          showInfo={showSessionInfo} onCloseInfo={() => setShowSessionInfo(false)}
          infoTitle="Session times" infoDesc="When you started and finished each session, and how long it ran — useful for spotting inconsistent bedtimes or early mask removals."
          infoColor={C.blue} />
        <BarChartLabels data={data} labelEvery={labelEvery} labelWidth={30} />
        {sessionDetailIdx != null && <SessionDetailPanel night={data[sessionDetailIdx]} onViewNight={() => onSelectNight(nights.indexOf(rawData[sessionDetailIdx]))} />}
      </div>

      <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
        <CardTitle sub={prevPeriod.length ? undefined : "Not enough history yet for a previous-period comparison"}>Trends (vs. previous {periodLabel})</CardTitle>
        <div style={{ display: "flex", marginTop: 4 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>This {periodLabel}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
              <span className="font-display" style={{ fontSize: 24, fontWeight: 800, color: T.ink }}>{avgUsed(data, "ahi").toFixed(1)}</span>
              <span style={{ fontSize: 12, color: T.muted }}>AHI</span>
            </div>
          </div>
          <div style={{ width: 1, background: T.line, margin: "4px 20px" }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>Last {periodLabel}</div>
            {prevPeriod.length ? (
              <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                <span className="font-display" style={{ fontSize: 24, fontWeight: 800, color: T.muted }}>{avgUsed(prevPeriod, "ahi").toFixed(1)}</span>
                <span style={{ fontSize: 12, color: T.muted }}>AHI</span>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: T.muted, fontStyle: "italic" }}>Not enough history yet</div>
            )}
          </div>
        </div>
        <div style={{ marginTop: 8 }}>
          <StatRow icon={LeakIcon} iconColor={C.purple} label="Leak average" value={`${wkLeakAvg.toFixed(0)} L/min`} warn={wkLeakAvg >= targets.leak} delta={prevPeriod.length ? pct(wkLeakAvg, avgUsed(prevPeriod, "leak")) : undefined} />
          <StatRow icon={Clock} iconColor={C.blue} label="Usage average" value={`${wkUsageAvg.toFixed(1)}h`} warn={wkUsageAvg < targets.usage} delta={prevPeriod.length ? pct(wkUsageAvg, avg(prevPeriod, "usage")) : undefined} />
          <StatRow icon={Gauge} iconColor={C.orange} label={`${rangeDays}-night compliance`} value={`${compliance}%`} warn={compliance < targets.compliance} />
          <StatRow icon={Calendar} iconColor={SEV.bad} label="Nights not used" value={noUsageCount} warn={noUsageCount > 0} last />
        </div>
      </div>
    </div>
  );
}

/* ---------- Stats ---------- */
function StatsScreen({ nights, targets }) {
  const avg = (arr, k) => arr.reduce((s, n) => s + n[k], 0) / arr.length;
  // avgUsed skips no-usage nights for anything that only exists because a
  // session happened (AHI, leak, event mix) — same reasoning as Trends'
  // avgUsed. Threshold/hit-rate stats below take a different approach: a
  // no-usage night stays in the denominator but can never count as a pass,
  // since "no session" isn't the same as "target met."
  const avgUsed = (arr, k) => {
    const used = arr.filter((n) => !n.noUsage);
    return used.length ? used.reduce((s, n) => s + n[k], 0) / used.length : 0;
  };
  const obs = avgUsed(nights, "obstructive"), cen = avgUsed(nights, "central"), hyp = avgUsed(nights, "hypopnea");
  const compliance = Math.round((nights.filter((n) => n.usage >= targets.usage).length / nights.length) * 100);
  const under3 = Math.round((nights.filter((n) => !n.noUsage && n.ahi < targets.ahi).length / nights.length) * 100);
  const leakUnder20 = Math.round((nights.filter((n) => !n.noUsage && n.leak < targets.leak).length / nights.length) * 100);
  const maskOffUnder = Math.round((nights.filter((n) => !n.noUsage && n.maskOff <= targets.maskOff).length / nights.length) * 100);
  const noUsageCount = nights.filter((n) => n.noUsage).length;
  const streak = computeStreak(nights, targets);
  const weekday = nights.filter((n) => !n.weekend), weekend = nights.filter((n) => n.weekend);

  const tagKeys = Object.keys(TAG_LABEL);
  const overallAhi = avgUsed(nights, "ahi");
  const rows = tagKeys.map((tk) => {
    const withTag = nights.filter((n) => !n.noUsage && n.tags.includes(tk));
    const ahiPct = withTag.length ? Math.round(((avg(withTag, "ahi") - overallAhi) / overallAhi) * 100) : null;
    return { tk, n: withTag.length, ahiPct };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
        <CardTitle sub="30-night average">Event breakdown & mask seal</CardTitle>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "center", gap: 12, marginTop: 12 }}>
          <div style={{ flex: 1 }}>
            <EventRing night={{ obstructive: obs, central: cen, hypopnea: hyp }} size={140} />
          </div>
          <div style={{ flex: 1 }}>
            <SealRing nights={nights} size={140} />
          </div>
        </div>
      </div>

      <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
        <CardTitle>30-night targets</CardTitle>
        <StatRow icon={Clock} iconColor={C.orange} label={`${targets.usage}h+ usage`} value={`${compliance}%`} warn={compliance < targets.compliance}
          description={`Your compliance target is ${targets.usage}+ hours on ${targets.compliance}% of nights — adjustable in Settings, and commonly used by insurers and clinicians as the standard benchmark for ongoing therapy.`} />
        <StatRow icon={Activity} iconColor={C.blue} label={`AHI under ${targets.ahi}`} value={`${under3}%`} warn={under3 < targets.compliance}
          description="The share of nights your AHI stayed under your target — a commonly used marker of well-controlled therapy. Occasional dips below this aren't unusual; a persistently low percentage is worth discussing." />
        <StatRow icon={LeakIcon} iconColor={C.purple} label={`Leak under ${targets.leak}`} value={`${leakUnder20}%`} warn={leakUnder20 < targets.compliance}
          description="The share of nights your leak stayed under your target. A falling percentage over time often traces back to cushion or headgear wear — check Equipment if this looks low." />
        <StatRow icon={PowerOff} iconColor={T.muted} label={`Mask-off under ${targets.maskOff}`} value={`${maskOffUnder}%`} warn={maskOffUnder < targets.compliance}
          description="The share of nights you stayed at or under your mask-off target. Frequent mask-off events usually trace back to comfort — fit, pressure, or something disrupting sleep enough to prompt removal." />
        <StatRow icon={Calendar} iconColor={T.muted} label="Weekday AHI avg" value={avgUsed(weekday, "ahi").toFixed(1)} />
        <StatRow icon={Calendar} iconColor={T.muted} label="Weekend AHI avg" value={avgUsed(weekend, "ahi").toFixed(1)} />
        <StatRow icon={Flame} iconColor={C.orange} label="Current streak" value={streak > 0 ? `${streak} night${streak === 1 ? "" : "s"}` : "None active"}
          description={`Consecutive nights at or above your ${targets.usage}h usage target — the one thing on this list that's entirely within your control, night to night.`} />
        <StatRow icon={Calendar} iconColor={SEV.bad} label="Nights not used" value={noUsageCount} warn={noUsageCount > 0} last
          description="Nights the machine wasn't used at all. Counted against your targets above rather than left out of them — a skipped night is still a night without therapy." />
      </div>

      <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
        <CardTitle sub="vs. your 30-night baseline">Tag correlation</CardTitle>
        {rows.map((r, i) => (
          <StatRow key={r.tk} icon={TAG_ICON[r.tk]} iconColor={TAG_COLOR[r.tk]}
            label={AUTO_TAGS.has(r.tk) ? `${TAG_LABEL[r.tk]} (auto · ${r.n})` : `${TAG_LABEL[r.tk]} (${r.n})`}
            value={r.ahiPct === null ? "AHI —" : `AHI ${r.ahiPct > 0 ? "+" : ""}${r.ahiPct}%`}
            last={i === rows.length - 1} />
        ))}
      </div>
    </div>
  );
}

/* ---------- Drill-down helpers & charts (module-level so zoom/pan state
   survives re-renders of the parent screen — a nested component would be
   redefined, and therefore remounted with state reset, on every render) ---------- */
function formatClock(hourFloat) {
  const h24 = ((hourFloat % 24) + 24) % 24;
  const h = Math.floor(h24);
  const m = Math.round((h24 - h) * 60);
  const ampm = h < 12 ? "AM" : "PM";
  let h12 = h % 12; if (h12 === 0) h12 = 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}
// Real wall-clock hour markers (matches how a real overnight chart reads —
// "11:00 PM, 12:00 AM..." — rather than elapsed time from session start).
// Steps by more than 1 hour once the span is long enough that hourly
// labels would start colliding at typical mobile chart widths.
const EVENT_COLOR = { Obstructive: C.red, Central: C.orange, Hypopnea: C.blue };
const DEFAULT_CHANNEL_ORDER = ["leak", "flowLimit", "snore", "tidalVolume", "respRate", "minuteVent", "inspTime", "expTime"];
function hourTicks(startHour, spanHours, maxLabels = 5) {
  let step = 1;
  while (spanHours / step > maxLabels) step++;
  const first = Math.ceil(startHour / step) * step;
  const list = [];
  for (let h = first; h < startHour + spanHours; h += step) {
    list.push({ frac: (h - startHour) / spanHours, label: formatClock(h) });
  }
  return list;
}
function bandPath(values, y0, y1, w) {
  const h = y1 - y0;
  return values.map((v, i) => `${(i / (values.length - 1)) * w},${(y1 - v * h).toFixed(1)}`).join(" L ");
}
// Drag-to-pan: converts a horizontal pointer drag into a change in panStart
// (0..1, same value the buttons used to control). touchAction:"pan-y" on the
// element lets vertical page-scroll pass through untouched while horizontal
// drags are captured here.
// scaleSamples: how many samples one full drag-width should move through —
//   pass winLen for "drag the chart content" (content scrolls opposite the
//   drag direction), or the full total for "drag a mini-map handle" (the
//   handle moves the same direction you drag it — invert:true).
function makePanHandlers(dragRef, { active, scaleSamples, maxStart, panStart, setPanStart, invert = false }) {
  return {
    onPointerDown: (e) => {
      if (!active || maxStart <= 0) return;
      dragRef.current = { dragging: true, startX: e.clientX, startPan: panStart, width: e.currentTarget.getBoundingClientRect().width || 1 };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e) => {
      const d = dragRef.current;
      if (!d || !d.dragging) return;
      const dx = e.clientX - d.startX;
      const sign = invert ? 1 : -1;
      const deltaFrac = sign * (dx / d.width) * (scaleSamples / maxStart);
      setPanStart(Math.max(0, Math.min(1, d.startPan + deltaFrac)));
    },
    onPointerUp: () => { if (dragRef.current) dragRef.current.dragging = false; },
    onPointerCancel: () => { if (dragRef.current) dragRef.current.dragging = false; },
  };
}
// Jumps zoom+pan to center the deepest zoom level on a specific event —
// used when an event dot is tapped, so you don't have to manually zoom
// and hunt for it.
function jumpToEvent(origX, total, winLenFrac, targetZoomValue, setZoom, setPanStart) {
  const winLen = Math.max(10, Math.round(total * winLenFrac));
  const maxStart = Math.max(0, total - winLen);
  const desiredStart = origX * total - winLen / 2;
  const clamped = Math.max(0, Math.min(maxStart, desiredStart));
  setZoom(targetZoomValue);
  setPanStart(maxStart > 0 ? clamped / maxStart : 0);
}
// Zoom presets for the individual charts — zoom is a continuous fraction
// (1 = full night), and brush-select can land on any value; these presets
// are only used now to define "fully zoomed in" for tap-an-event-to-jump.
const ZOOM_PRESETS = [1, 0.4, 0.18];
function computeStats(values, scale) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const pick = (p) => sorted[Math.min(n - 1, Math.floor(p * n))];
  return { min: sorted[0] * scale, median: pick(0.5) * scale, p95: pick(0.95) * scale, p995: pick(0.995) * scale, max: sorted[n - 1] * scale };
}
function StatQuad({ stats, unit, decimals }) {
  return (
    <div style={{ display: "flex", margin: "8px 0" }}>
      {[["Min", stats.min], ["Median", stats.median], ["95%", stats.p95], ["Max", stats.max]].map(([label, val]) => (
        <div key={label} style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: T.muted, marginBottom: 1 }}>{label}</div>
          <div className="font-display" style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{val.toFixed(decimals)}{unit}</div>
        </div>
      ))}
    </div>
  );
}
function hexA(hex, alpha) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16), g = parseInt(h.substring(2, 4), 16), b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
// The full-night scrubber strip below each chart — shows the whole night's
// shape at a glance, with a draggable box marking the current zoom/pan
// window. Dragging the box moves it directly (unlike dragging the chart
// itself, which scrolls content the opposite way).
function MiniMap({ layers, total, winLen, start, maxStart, panStart, onPanChange, dragRef, accentColor }) {
  const w = 300, h = 34;
  const n = layers.length;
  const bandH = h / n;
  const leftPct = (start / total) * 100;
  const widthPct = Math.max((winLen / total) * 100, 3);
  const handlers = makePanHandlers(dragRef, { active: true, maxStart, panStart, setPanStart: onPanChange, scaleSamples: total, invert: true });
  return (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.line}` }}>
      <div className="font-display" style={{ fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 6 }}>Full night</div>
      <div style={{ position: "relative", height: h, borderRadius: 8, background: T.bg, overflow: "hidden" }}>
        <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block" }}>
          {layers.map((l, li) => {
            const y0 = li * bandH, y1 = y0 + bandH;
            const barW = w / l.values.length;
            return l.mode === "bar" ? (
              <g key={li}>
                {l.values.map((v, i) => v > 0.02 ? (
                  <rect key={i} x={i * barW} y={y1 - v * bandH} width={Math.max(1, barW)} height={v * bandH} fill={l.color} opacity={0.5} />
                ) : null)}
              </g>
            ) : (
              <path key={li} d={`M ${bandPath(l.values, y0 + 2, y1 - 2, w)}`} fill="none" stroke={l.color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" opacity={0.55} />
            );
          })}
        </svg>
        <div {...handlers} style={{
          position: "absolute", top: 0, bottom: 0, left: `${leftPct}%`, width: `${widthPct}%`,
          border: `1.5px solid ${accentColor}`, background: hexA(accentColor, 0.16), borderRadius: 6,
          cursor: "grab", touchAction: "pan-y",
        }} />
      </div>
    </div>
  );
}
// Standalone per-channel chart — real drill-down into one metric at a
// time, distinct from the combined synchronized view. Has its own y-axis
// scale, zoom/pan window, and expand-to-fullscreen.
function MiniChart({ label, sub, fullLabel, unitLabel, values, color, mode, unit, decimals = 1, axisMax, usageHours, startHour, onExpand, events,
  zoom: zoomProp, onZoomChange, panStart: panStartProp, onPanChange }) {
  const [localZoom, setLocalZoom] = useState(1);
  const [localPanStart, setLocalPanStart] = useState(0);
  const zoom = zoomProp !== undefined ? zoomProp : localZoom;
  const setZoom = onZoomChange || setLocalZoom;
  const panStart = panStartProp !== undefined ? panStartProp : localPanStart;
  const setPanStart = onPanChange || setLocalPanStart;
  const [showStats, setShowStats] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const dragRef = useRef(null);
  const miniDragRef = useRef(null);
  const brushRef = useRef(null);
  const [brushSel, setBrushSel] = useState(null);
  const isZoomedIn = zoom < 0.999;
  const total = values.length;
  const winLen = Math.max(10, Math.round(total * zoom));
  const maxStart = Math.max(0, total - winLen);
  const start = Math.min(maxStart, Math.round(panStart * maxStart));
  const visible = values.slice(start, start + winLen);
  const panHandlers = makePanHandlers(dragRef, { active: isZoomedIn, scaleSamples: winLen, maxStart, panStart, setPanStart });
  const winStartFrac = start / total, winEndFrac = (start + winLen) / total;
  const visEvents = (events || [])
    .filter((e) => e.x >= winStartFrac && e.x <= winEndFrac)
    .map((e) => ({ ...e, origX: e.x, x: (e.x - winStartFrac) / (winEndFrac - winStartFrac) }));

  // Drag-to-select-and-zoom — only ever active once "Select" mode is
  // explicitly turned on. When it's off (the default), no pointer handlers
  // are attached to the chart at all, so normal page scroll is completely
  // untouched — there's no gesture-timing heuristic to get wrong, because
  // there's no ambiguity: entering the mode is the user's explicit signal
  // that the next drag is a selection, not a scroll attempt.
  function handleBrushDown(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const startF = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    brushRef.current = { rect, startF };
    setBrushSel({ a: startF, b: startF });
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function handleBrushMove(e) {
    const d = brushRef.current;
    if (!d) return;
    const f = Math.max(0, Math.min(1, (e.clientX - d.rect.left) / d.rect.width));
    setBrushSel({ a: d.startF, b: f });
  }
  function handleBrushUp() {
    const sel = brushRef.current && brushSel;
    brushRef.current = null;
    if (sel) {
      const a = Math.min(sel.a, sel.b), b = Math.max(sel.a, sel.b);
      const width = b - a;
      if (width > 0.03) {
        // a/b are fractions of whatever's currently visible, not of the
        // whole night — once already zoomed in those aren't the same
        // thing, so map them into whole-night fractions via the current
        // window's own bounds before computing the new zoom/pan.
        const winSpan = winEndFrac - winStartFrac;
        const globalA = winStartFrac + a * winSpan;
        const globalB = winStartFrac + b * winSpan;
        const newZoom = Math.max(0.02, globalB - globalA);
        const maxStartFrac = Math.max(0, 1 - newZoom);
        const newStartFrac = Math.max(0, Math.min(maxStartFrac, (globalA + globalB) / 2 - newZoom / 2));
        setZoom(newZoom);
        setPanStart(maxStartFrac > 0 ? newStartFrac / maxStartFrac : 0);
        setSelectMode(false);
      }
    }
    setBrushSel(null);
  }
  const brushHandlers = { onPointerDown: handleBrushDown, onPointerMove: handleBrushMove, onPointerUp: handleBrushUp, onPointerCancel: handleBrushUp };

  const w = 300, h = 104;
  const barW = w / visible.length;
  const t0 = (start / total) * usageHours;
  const t1 = ((start + winLen) / total) * usageHours;
  const ticks = hourTicks(startHour + t0, t1 - t0);

  return (
    <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
        <span className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>{fullLabel || label}</span>
        <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
          <button onClick={() => setShowMore((s) => !s)}
            style={{ width: 32, height: 32, borderRadius: "50%", background: showMore ? T.ink : T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MoreHorizontal size={15} style={{ color: showMore ? "#FFFFFF" : T.muted }} />
          </button>
          <button onClick={() => { setSelectMode((s) => !s); setShowMore(false); }}
            style={{ width: 32, height: 32, borderRadius: "50%", background: selectMode ? T.ink : T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Crosshair size={13} style={{ color: selectMode ? "#FFFFFF" : T.ink }} />
          </button>
          {isZoomedIn && (
            <button onClick={() => { setZoom(1); setPanStart(0); }}
              style={{ width: 32, height: 32, borderRadius: "50%", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ZoomOut size={13} style={{ color: T.ink }} />
            </button>
          )}
          <button onClick={onExpand} style={{ width: 32, height: 32, borderRadius: "50%", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Maximize2 size={13} style={{ color: T.ink }} />
          </button>
        </div>
        {showMore && (
          <>
            <div onClick={() => setShowMore(false)} style={{ position: "fixed", inset: 0, zIndex: 9 }} />
            <div style={{
              position: "absolute", top: "100%", right: 0, marginTop: 6, zIndex: 10, minWidth: 168,
              background: T.surface, borderRadius: 14, boxShadow: "0 6px 20px rgba(0,0,0,0.14)", padding: 6,
            }}>
              {sub && (
                <button onClick={() => { setShowInfo((s) => !s); setShowStats(false); setShowMore(false); }}
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 10px", borderRadius: 9, background: "none" }}>
                  <Info size={14} style={{ color: T.muted }} />
                  <span className="font-display" style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>Description</span>
                </button>
              )}
              <button onClick={() => { setShowStats((s) => !s); setShowInfo(false); setShowMore(false); }}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 10px", borderRadius: 9, background: "none" }}>
                <BarChart3 size={14} style={{ color: T.muted }} />
                <span className="font-display" style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>Stats</span>
              </button>
            </div>
          </>
        )}
      </div>
      {showStats && <StatQuad stats={computeStats(visible, axisMax)} unit={unit} decimals={decimals} />}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <div style={{ position: "relative", width: 20, height: h, flexShrink: 0 }}>
          <span className="font-display" style={{ position: "absolute", top: 0, left: 0, fontSize: 10, fontWeight: 600, color: T.muted }}>{axisMax}</span>
          <span className="font-display" style={{ position: "absolute", bottom: -1, left: 0, fontSize: 10, fontWeight: 600, color: T.muted }}>0</span>
        </div>
        <div {...(selectMode ? brushHandlers : (isZoomedIn ? panHandlers : {}))} style={{ position: "relative", flex: 1, touchAction: "pan-y", cursor: selectMode ? "crosshair" : isZoomedIn ? "grab" : "default", outline: selectMode ? `2px dashed ${color}` : "none", outlineOffset: 2, borderRadius: 4 }}>
          <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block" }}>
            {ticks.map((t) => (
              <line key={t.label} x1={t.frac * w} x2={t.frac * w} y1={0} y2={h} stroke={T.line} strokeWidth="1" />
            ))}
            <line x1={0} x2={w} y1={h - 1} y2={h - 1} stroke={T.line} strokeWidth="1" />
            {mode === "line" ? (
              <path d={`M ${bandPath(visible, 4, h, w)}`} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              visible.map((v, i) => v > 0.02 ? (
                <rect key={i} x={i * barW + barW * 0.3} y={h - v * (h - 4)} width={Math.max(1, barW * 0.4)} height={v * (h - 4)} fill={color} />
              ) : null)
            )}
          </svg>
          {brushSel && selectMode && (
            <div style={{
              position: "absolute", top: 0, bottom: 0, zIndex: 3, pointerEvents: "none",
              left: `${Math.min(brushSel.a, brushSel.b) * 100}%`, width: `${Math.abs(brushSel.b - brushSel.a) * 100}%`,
              background: hexA(color, 0.18), border: `1.5px solid ${color}`, borderRadius: 4,
            }} />
          )}
          {showInfo && sub && (
            <div onClick={() => setShowInfo(false)} style={{
              position: "absolute", inset: 0, zIndex: 2, overflow: "hidden", background: T.surface, border: `1.5px solid ${color}`, borderRadius: 10,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8px 12px", textAlign: "center", cursor: "pointer",
            }}>
              <span className="font-display" style={{ fontSize: 12, fontWeight: 700, color: T.ink }}>{fullLabel || label}{unitLabel ? ` · ${unitLabel}` : ""}</span>
              <span style={{ fontSize: 11, color: T.muted, marginTop: 4, lineHeight: 1.4 }}>{sub}</span>
            </div>
          )}
          {events && visEvents.map((e, i) => (
            <div key={i} onPointerDown={(ev) => ev.stopPropagation()}
              onClick={() => jumpToEvent(e.origX, total, ZOOM_PRESETS[ZOOM_PRESETS.length - 1], ZOOM_PRESETS[ZOOM_PRESETS.length - 1], setZoom, setPanStart)}
              style={{
                position: "absolute", left: `${e.x * 100}%`, top: 8, cursor: "pointer",
                transform: "translate(-50%, -50%)", width: 7, height: 7, borderRadius: "50%",
                background: EVENT_COLOR[e.type], border: `1.5px solid ${T.surface}`,
              }} />
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <div style={{ width: 20, flexShrink: 0 }} />
        <div style={{ position: "relative", height: 14, flex: 1 }}>
          {ticks.map((t) => (
            <span key={t.label} className="font-display" style={{ position: "absolute", left: `${t.frac * 100}%`, transform: t.frac < 0.05 ? "none" : t.frac > 0.95 ? "translateX(-100%)" : "translateX(-50%)", fontSize: 9, fontWeight: 600, color: T.muted, whiteSpace: "nowrap" }}>{t.label}</span>
          ))}
        </div>
      </div>
      {isZoomedIn && (
        <MiniMap layers={[{ values, color, mode }]} total={total} winLen={winLen} start={start} maxStart={maxStart}
          panStart={panStart} onPanChange={setPanStart} dragRef={miniDragRef} accentColor={color} />
      )}
    </div>
  );
}
// Fullscreen version of a single channel — has its own zoom/pan too, now
// that it's a stable top-level component rather than being redefined (and
// therefore remounted) every time the parent screen re-renders.
function BigChannelChart({ values, color, mode, axisMax, unit, decimals = 1, usageHours, startHour, events, sub, label, fullLabel, unitLabel }) {
  const [zoom, setZoom] = useState(1);
  const [panStart, setPanStart] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const dragRef = useRef(null);
  const miniDragRef = useRef(null);
  const brushRef = useRef(null);
  const [brushSel, setBrushSel] = useState(null);
  const isZoomedIn = zoom < 0.999;
  const total = values.length;
  const winLen = Math.max(10, Math.round(total * zoom));
  const maxStart = Math.max(0, total - winLen);
  const start = Math.min(maxStart, Math.round(panStart * maxStart));
  const visible = values.slice(start, start + winLen);
  const panHandlers = makePanHandlers(dragRef, { active: isZoomedIn, scaleSamples: winLen, maxStart, panStart, setPanStart });
  const winStartFrac = start / total, winEndFrac = (start + winLen) / total;
  const visEvents = (events || [])
    .filter((e) => e.x >= winStartFrac && e.x <= winEndFrac)
    .map((e) => ({ ...e, origX: e.x, x: (e.x - winStartFrac) / (winEndFrac - winStartFrac) }));

  function handleBrushDown(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const startF = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    brushRef.current = { rect, startF };
    setBrushSel({ a: startF, b: startF });
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function handleBrushMove(e) {
    const d = brushRef.current;
    if (!d) return;
    const f = Math.max(0, Math.min(1, (e.clientX - d.rect.left) / d.rect.width));
    setBrushSel({ a: d.startF, b: f });
  }
  function handleBrushUp() {
    const sel = brushRef.current && brushSel;
    brushRef.current = null;
    if (sel) {
      const a = Math.min(sel.a, sel.b), b = Math.max(sel.a, sel.b);
      const width = b - a;
      if (width > 0.03) {
        // a/b are fractions of whatever's currently visible, not of the
        // whole night — once already zoomed in those aren't the same
        // thing, so map them into whole-night fractions via the current
        // window's own bounds before computing the new zoom/pan.
        const winSpan = winEndFrac - winStartFrac;
        const globalA = winStartFrac + a * winSpan;
        const globalB = winStartFrac + b * winSpan;
        const newZoom = Math.max(0.02, globalB - globalA);
        const maxStartFrac = Math.max(0, 1 - newZoom);
        const newStartFrac = Math.max(0, Math.min(maxStartFrac, (globalA + globalB) / 2 - newZoom / 2));
        setZoom(newZoom);
        setPanStart(maxStartFrac > 0 ? newStartFrac / maxStartFrac : 0);
        setSelectMode(false);
      }
    }
    setBrushSel(null);
  }
  const brushHandlers = { onPointerDown: handleBrushDown, onPointerMove: handleBrushMove, onPointerUp: handleBrushUp, onPointerCancel: handleBrushUp };

  const w = 800, h = 220;
  const barW = w / visible.length;
  const t0 = (start / total) * usageHours;
  const t1 = ((start + winLen) / total) * usageHours;
  const ticks = hourTicks(startHour + t0, t1 - t0, 9);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", flexShrink: 0, position: "relative" }}>
        <div style={{ display: "flex", gap: 5 }}>
          <button onClick={() => setShowMore((s) => !s)}
            style={{ width: 32, height: 32, borderRadius: "50%", background: showMore ? T.ink : T.surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <MoreHorizontal size={16} style={{ color: showMore ? "#FFFFFF" : T.muted }} />
          </button>
          <button onClick={() => { setSelectMode((s) => !s); setShowMore(false); }}
            style={{ width: 32, height: 32, borderRadius: "50%", background: selectMode ? T.ink : T.surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Crosshair size={14} style={{ color: selectMode ? "#FFFFFF" : T.ink }} />
          </button>
          {isZoomedIn && (
            <button onClick={() => { setZoom(1); setPanStart(0); }}
              style={{ width: 32, height: 32, borderRadius: "50%", background: T.surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ZoomOut size={14} style={{ color: T.ink }} />
            </button>
          )}
        </div>
        {showMore && (
          <>
            <div onClick={() => setShowMore(false)} style={{ position: "fixed", inset: 0, zIndex: 9 }} />
            <div style={{
              position: "absolute", top: "100%", right: 0, marginTop: 6, zIndex: 10, minWidth: 180,
              background: T.surface, borderRadius: 14, boxShadow: "0 6px 20px rgba(0,0,0,0.14)", padding: 6,
            }}>
              {sub && (
                <button onClick={() => { setShowInfo((s) => !s); setShowStats(false); setShowMore(false); }}
                  style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 10px", borderRadius: 9, background: "none" }}>
                  <Info size={15} style={{ color: T.muted }} />
                  <span className="font-display" style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>Description</span>
                </button>
              )}
              <button onClick={() => { setShowStats((s) => !s); setShowInfo(false); setShowMore(false); }}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 10px", borderRadius: 9, background: "none" }}>
                <BarChart3 size={15} style={{ color: T.muted }} />
                <span className="font-display" style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>Stats</span>
              </button>
            </div>
          </>
        )}
      </div>
      {showStats && (
        <div style={{ flexShrink: 0, maxWidth: 360, marginTop: 8 }}>
          <StatQuad stats={computeStats(visible, axisMax != null ? axisMax : 1)} unit={unit} decimals={decimals} />
        </div>
      )}
      <div style={{ display: "flex", gap: 8, flex: 1, minHeight: 0, marginTop: 8 }}>
        {axisMax != null && (
          <div style={{ position: "relative", width: 26, flexShrink: 0 }}>
            <span className="font-display" style={{ position: "absolute", top: 0, left: 0, fontSize: 12, fontWeight: 600, color: T.muted }}>{axisMax}</span>
            <span className="font-display" style={{ position: "absolute", bottom: 4, left: 0, fontSize: 12, fontWeight: 600, color: T.muted }}>0</span>
          </div>
        )}
        <div {...(selectMode ? brushHandlers : (isZoomedIn ? panHandlers : {}))} style={{ position: "relative", flex: 1, touchAction: "pan-y", cursor: selectMode ? "crosshair" : isZoomedIn ? "grab" : "default", outline: selectMode ? `2px dashed ${color}` : "none", outlineOffset: 2, borderRadius: 4 }}>
          <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block" }}>
            {ticks.map((t) => (
              <line key={t.label} x1={t.frac * w} x2={t.frac * w} y1={0} y2={h} stroke={T.line} strokeWidth="1" />
            ))}
            <line x1={0} x2={w} y1={h - 1} y2={h - 1} stroke={T.line} strokeWidth="1" />
            {mode === "line" ? (
              <path d={`M ${bandPath(visible, 8, h, w)}`} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              visible.map((v, i) => v > 0.02 ? (
                <rect key={i} x={i * barW + barW * 0.3} y={h - v * (h - 8)} width={Math.max(2, barW * 0.4)} height={v * (h - 8)} fill={color} />
              ) : null)
            )}
          </svg>
          {brushSel && selectMode && (
            <div style={{
              position: "absolute", top: 0, bottom: 0, zIndex: 3, pointerEvents: "none",
              left: `${Math.min(brushSel.a, brushSel.b) * 100}%`, width: `${Math.abs(brushSel.b - brushSel.a) * 100}%`,
              background: hexA(color, 0.18), border: `1.5px solid ${color}`, borderRadius: 4,
            }} />
          )}
          {showInfo && sub && (
            <div onClick={() => setShowInfo(false)} style={{
              position: "absolute", inset: 0, zIndex: 2, overflow: "hidden", background: T.surface, border: `1.5px solid ${color}`, borderRadius: 10,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "12px 24px", textAlign: "center", cursor: "pointer",
            }}>
              <span className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>{fullLabel || label}</span>
              {unitLabel && <span style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>Measured in {unitLabel}</span>}
              <span style={{ fontSize: 13, color: T.ink, marginTop: 6, lineHeight: 1.4, maxWidth: 480 }}>{sub}</span>
            </div>
          )}
          {events && visEvents.map((e, i) => (
            <div key={i} onPointerDown={(ev) => ev.stopPropagation()}
              onClick={() => jumpToEvent(e.origX, total, ZOOM_PRESETS[ZOOM_PRESETS.length - 1], ZOOM_PRESETS[ZOOM_PRESETS.length - 1], setZoom, setPanStart)}
              style={{
                position: "absolute", left: `${e.x * 100}%`, top: 16, cursor: "pointer",
                transform: "translate(-50%, -50%)", width: 10, height: 10, borderRadius: "50%",
                background: EVENT_COLOR[e.type], border: `2px solid ${T.surface}`,
              }} />
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexShrink: 0 }}>
        {axisMax != null && <div style={{ width: 26, flexShrink: 0 }} />}
        <div style={{ position: "relative", height: 16, flex: 1 }}>
          {ticks.map((t) => (
            <span key={t.label} className="font-display" style={{ position: "absolute", left: `${t.frac * 100}%`, transform: t.frac < 0.05 ? "none" : t.frac > 0.95 ? "translateX(-100%)" : "translateX(-50%)", fontSize: 12, fontWeight: 600, color: T.muted, whiteSpace: "nowrap" }}>{t.label}</span>
          ))}
        </div>
      </div>
      {isZoomedIn && (
        <div style={{ flexShrink: 0 }}>
          <MiniMap layers={[{ values, color, mode }]} total={total} winLen={winLen} start={start} maxStart={maxStart}
            panStart={panStart} onPanChange={setPanStart} dragRef={miniDragRef} accentColor={color} />
        </div>
      )}
    </div>
  );
}

/* ---------- Drill-down ---------- */
function DrillDownScreenNight({ nights, idx, setIdx, targets, onOpenTagEntry }) {
  const night = nights[idx];
  // Always includes whichever night is currently selected — a fixed
  // "last 10" slice would go blank (no highlighted night at all) once you
  // page further back than that window via the prev/next arrows.
  const pickerWindow = 10;
  let winStart = Math.max(0, idx - Math.floor(pickerWindow / 2));
  let winEnd = Math.min(nights.length, winStart + pickerWindow);
  winStart = Math.max(0, winEnd - pickerWindow);
  const recentWindow = nights.slice(winStart, winEnd);
  const activePickerRef = useRef(null);
  useEffect(() => {
    activePickerRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [idx]);
  const [expandedChart, setExpandedChart] = useState(null);
  const [syncZoom, setSyncZoom] = useState(1);
  const [syncPan, setSyncPan] = useState(0);
  const syncDragRef = useRef(null);
  const syncMiniDragRef = useRef(null);
  const syncBrushRef = useRef(null);
  const [syncSelectMode, setSyncSelectMode] = useState(false);
  const [syncBrushSel, setSyncBrushSel] = useState(null);
  const [chartsLinked, setChartsLinked] = useState(false);
  const [activeGroup, setActiveGroup] = useState("Core");
  const [syncShowInfo, setSyncShowInfo] = useState(false);
  const [linkedZoom, setLinkedZoom] = useState(1);
  const [linkedPan, setLinkedPan] = useState(0);

  // All channel data generated together from one event set and one
  // resolution, so every channel — whether shown in the combined
  // Synchronized view or its own chart — lines up and stays consistent.
  const { events, detail, timeInApneaSec } = useMemo(() => {
    const N2 = 240;
    const hrs = night.usage || 7;
    const mkEvents = (rate, type) => {
      const count = Math.min(8, Math.max(0, Math.round(rate * hrs)));
      // Real obstructive/hypopnea events run roughly 12-38s by clinical
      // convention (10s is the scoring minimum). Fixed here, inside the
      // same memo as the rest of the night's synthetic data, so it's
      // generated once per night rather than drifting on every re-render.
      return Array.from({ length: count }, () => ({ type, x: 0.08 + Math.random() * 0.84, durationSec: 12 + Math.random() * 26 }));
    };
    const evs = [
      ...mkEvents(night.obstructive, "Obstructive"),
      ...mkEvents(night.central, "Central"),
      ...mkEvents(night.hypopnea, "Hypopnea"),
    ].sort((a, b) => a.x - b.x);
    const timeInApneaSec = evs.reduce((s, e) => s + e.durationSec, 0);

    const flow = [], pressure = [], leak = [], snore = [], flowLimit = [], tidalVolume = [], respRate = [], minuteVent = [], inspTime = [], expTime = [];
    let prevTV = 0.5, prevRR = 0.28;
    for (let i = 0; i < N2; i++) {
      const near = evs.find((e) => Math.abs(e.x * N2 - i) < 3);
      let f = 0.5 + Math.sin(i / 12) * 0.28;
      if (near) f *= 0.18;
      flow.push(f);
      pressure.push(0.5 + Math.sin(i / 160) * 0.02); // fixed pressure — essentially flat
      leak.push(Math.max(0, Math.min(1, 0.22 + (i / N2) * 0.3 + Math.sin(i / 14) * 0.06 + (Math.random() - 0.5) * 0.05)));
      snore.push(Math.random() < 0.025 ? 0.15 + Math.random() * 0.5 : 0);
      flowLimit.push(near ? Math.min(1, 0.2 + Math.random() * 0.55) : (Math.random() < 0.05 ? Math.random() * 0.2 : 0));
      let tv = prevTV * 0.7 + 0.5 * 0.3 + (Math.random() - 0.5) * 0.3;
      if (near) tv *= 0.35;
      tv = Math.max(0.12, Math.min(1, tv));
      prevTV = tv;
      tidalVolume.push(tv);
      let rr = prevRR * 0.75 + 0.26 * 0.25 + (Math.random() - 0.5) * 0.16;
      rr += i < N2 * 0.15 ? 0.16 * (1 - i / (N2 * 0.15)) : 0;
      if (near) rr += 0.28;
      rr = Math.max(0.06, Math.min(1, rr));
      prevRR = rr;
      respRate.push(rr);
      minuteVent.push(Math.max(0.05, Math.min(1, near ? 0.3 + Math.random() * 0.6 : 0.24 + (Math.random() - 0.5) * 0.14)));
      inspTime.push(Math.max(0.05, Math.min(1, 0.35 + Math.random() * 0.55)));
      expTime.push(Math.max(0.05, Math.min(1, 0.3 + Math.random() * 0.55)));
    }
    return {
      events: evs,
      detail: { flow, pressure, leak, snore, flowLimit, tidalVolume, respRate, minuteVent, inspTime, expTime },
      timeInApneaSec,
    };
  }, [idx]);

  // Every overlayable channel, in one place — the single source of truth
  // for label/color/mode/axis/description, used by the individual charts,
  // the Synchronized view picker, and the fullscreen modal alike.
  const CHANNEL_REGISTRY = {
    flow: { label: "Flow", color: C.blue, mode: "line", values: detail.flow, axisMax: 1, unit: "" },
    pressure: { label: "Pressure", color: C.purple, mode: "line", values: detail.pressure, axisMax: 1, unit: "" },
    leak: { label: "Leak Rate", color: C.orange, mode: "line", values: detail.leak, axisMax: 25, unit: " L/min", unitLabel: "litres per minute",
      sub: "Air escaping around the mask seal rather than being delivered to you. Under about 24 L/min is generally considered an acceptable seal — a rising or spiking pattern usually means the mask needs adjusting or the cushion is due for replacement." },
    flowLimit: { label: "Flow Limit", color: C.pink, mode: "bar", values: detail.flowLimit, axisMax: 1, unit: "", decimals: 2, unitLabel: "a 0-1 flattening index, not a physical unit",
      sub: "How flattened your breathing waveform is — a subtler marker than a full obstructive event, but a sign the airway is starting to narrow. Frequent flow limitation without full events can still fragment sleep." },
    snore: { label: "Snore", color: SEV.good, mode: "bar", values: detail.snore, axisMax: 0.5, unit: "", decimals: 2, unitLabel: "a 0-0.5 intensity index, not a physical unit",
      sub: "Vibration detected in the airflow signal, usually from partial airway narrowing. Occasional snoring isn't necessarily meaningful, but a consistent nightly pattern is worth mentioning at your next clinician visit." },
    tidalVolume: { label: "Tidal Volume", color: C.blue, mode: "line", values: detail.tidalVolume, axisMax: 1500, unit: " ml", decimals: 0, unitLabel: "millilitres per breath",
      sub: "The amount of air moved in a single breath. Dips usually line up with obstructive or central events above — a breath that's cut short physically can't deliver a normal volume." },
    respRate: { label: "Resp. Rate", fullLabel: "Respiratory Rate", color: C.orange, mode: "line", values: detail.respRate, axisMax: 50, unit: " br/min", decimals: 0, unitLabel: "breaths per minute",
      sub: "How many breaths you're taking per minute. It's often naturally elevated in the first stretch of the night as you settle, then should steady out — a rate that stays high or spikes repeatedly can point to disrupted sleep." },
    minuteVent: { label: "Minute Vent", color: C.pink, mode: "line", values: detail.minuteVent, axisMax: 25, unit: " L/min", unitLabel: "litres per minute",
      sub: "Total air moved per minute — tidal volume multiplied by breathing rate. It's the best single number for overall ventilation, since it captures both how deep and how fast you're breathing." },
    inspTime: { label: "Insp. Time", fullLabel: "Inspiratory Time", color: SEV.good, mode: "line", values: detail.inspTime, axisMax: 5, unit: "s", unitLabel: "seconds",
      sub: "How long each in-breath lasts. This naturally varies breath to breath, but a big or sudden shift in rhythm alongside other channels can be a useful clue when something felt off that night." },
    expTime: { label: "Exp. Time", fullLabel: "Expiratory Time", color: C.blue, mode: "line", values: detail.expTime, axisMax: 5, unit: "s", unitLabel: "seconds",
      sub: "How long each out-breath lasts. Normally a little longer than inspiratory time — if that ratio flips or swings a lot, it's worth cross-checking against the Flow trace for the same stretch." },
  };
  // Groups the picker chips by what they actually measure, so choosing
  // channels is about intent (raw signal vs. breathing quality vs.
  // ventilation vs. timing) rather than one long undifferentiated list.
  const CHANNEL_GROUPS = [
    { label: "Core", keys: ["flow", "pressure", "leak"] },
    { label: "Breathing", keys: ["flowLimit", "snore"] },
    { label: "Ventilation", keys: ["tidalVolume", "respRate", "minuteVent"] },
    { label: "Timing", keys: ["inspTime", "expTime"] },
  ];
  // Condensed Min/Med/95%/99.5% table — same per-channel data as the
  // waveform charts above, just readable at a glance instead of requiring
  // each chart to be opened. Pressure is special-cased: on a fixed-pressure
  // machine there's no meaningful waveform percentile, so it reuses the
  // per-night pMin/pMax/p95 already generated for Trends' Pressure tab.
  const statRows = [
    { label: "Pressure", unit: " cmH₂O", decimals: 1, min: night.pMin, med: EQUIPMENT.fixedPressure, p95: night.p95, p995: night.pMax },
    (() => { const s = computeStats(detail.leak, CHANNEL_REGISTRY.leak.axisMax); return { label: "Leak rate", unit: " L/min", decimals: 1, min: s.min, med: s.median, p95: s.p95, p995: s.p995 }; })(),
    (() => { const s = computeStats(detail.respRate, CHANNEL_REGISTRY.respRate.axisMax); return { label: "Resp rate", unit: " br/min", decimals: 1, min: s.min, med: s.median, p95: s.p95, p995: s.p995 }; })(),
    (() => { const s = computeStats(detail.flowLimit, CHANNEL_REGISTRY.flowLimit.axisMax); return { label: "Flow limit", unit: "", decimals: 2, min: s.min, med: s.median, p95: s.p95, p995: s.p995 }; })(),
  ];
  const apneaPct = (timeInApneaSec / (night.usage * 3600)) * 100;
  const fmtDuration = (totalSec) => {
    const m = Math.floor(totalSec / 60), s = Math.round(totalSec % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };
  // The subset shown as individual cards below the Synchronized view —
  // Flow and Pressure are covered there instead (Pressure is flat/fixed,
  // Flow is redundant with the events already plotted on it).
  const [channelOrder, setChannelOrder] = useState(DEFAULT_CHANNEL_ORDER);
  const [reorderMode, setReorderMode] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState(["flow", "leak", "flowLimit"]);
  function toggleChannel(key) {
    setSyncShowInfo(false);
    setSelectedChannels((cur) => {
      if (cur.includes(key)) return cur.length > 1 ? cur.filter((k) => k !== key) : cur;
      if (cur.length >= 3) return [...cur.slice(1), key];
      return [...cur, key];
    });
  }
  function moveChannel(idx, dir) {
    setChannelOrder((cur) => {
      const target = idx + dir;
      if (target < 0 || target >= cur.length) return cur;
      const next = [...cur];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  const SYNC_WINDOW_FRACS = [1, 0.4, 0.18];
  function SyncChart({ bandH, gap, w, zoom = 1, panStart = 0, onPanChange, onZoomChange, dragRef, miniDragRef, fill = false, selectMode, onSelectModeChange, brushSel, onBrushSelChange, brushRef, showInfo, onShowInfoChange }) {
    const bandsFull = selectedChannels.map((k) => CHANNEL_REGISTRY[k]);
    const n = bandsFull.length;
    const totalH = bandH * n + gap * (n - 1);
    const frac = zoom;
    const isZoomedIn = zoom < 0.999;
    const total = bandsFull[0]?.values.length || 1;
    const winLen = Math.max(10, Math.round(total * frac));
    const maxStart = Math.max(0, total - winLen);
    const start = Math.min(maxStart, Math.round(panStart * maxStart));
    const bands = bandsFull.map((b) => ({ ...b, values: b.values.slice(start, start + winLen) }));
    const winStartFrac = start / total, winEndFrac = (start + winLen) / total;
    const visEvents = events
      .filter((e) => e.x >= winStartFrac && e.x <= winEndFrac)
      .map((e) => ({ ...e, origX: e.x, x: (e.x - winStartFrac) / (winEndFrac - winStartFrac) }));
    const t0 = winStartFrac * night.usage, t1 = winEndFrac * night.usage;
    const ticks = hourTicks(night.startHour + t0, t1 - t0, w > 400 ? 9 : 5);
    const flowBandIndex = selectedChannels.indexOf("flow");
    const accentColor = bandsFull[0]?.color || C.orange;
    const panHandlers = dragRef ? makePanHandlers(dragRef, { active: isZoomedIn, scaleSamples: winLen, maxStart, panStart, setPanStart: onPanChange }) : {};
    // Brush-select applies to the shared time axis all overlaid channels
    // already sit on — one selection zooms every active channel together,
    // rather than needing to pick which channel a drag "belongs to."
    function handleBrushDown(e) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      brushRef.current = { a: x, b: x };
      onBrushSelChange({ a: x, b: x });
    }
    function handleBrushMove(e) {
      if (!brushRef.current) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      brushRef.current = { ...brushRef.current, b: x };
      onBrushSelChange({ ...brushRef.current });
    }
    function handleBrushUp() {
      const sel = brushRef.current && brushSel;
      brushRef.current = null;
      if (sel) {
        const a = Math.min(sel.a, sel.b), b = Math.max(sel.a, sel.b);
        const width = b - a;
        if (width > 0.03) {
          // a/b are fractions of whatever's currently visible — map into
          // whole-night fractions via the current window's own bounds so a
          // second select-to-zoom, done while already zoomed in, computes
          // the correct window instead of a stale one.
          const winSpan = winEndFrac - winStartFrac;
          const globalA = winStartFrac + a * winSpan;
          const globalB = winStartFrac + b * winSpan;
          const newZoom = Math.max(0.02, globalB - globalA);
          const maxStartFrac = Math.max(0, 1 - newZoom);
          const newStartFrac = Math.max(0, Math.min(maxStartFrac, (globalA + globalB) / 2 - newZoom / 2));
          onZoomChange(newZoom);
          onPanChange(maxStartFrac > 0 ? newStartFrac / maxStartFrac : 0);
          onSelectModeChange(false);
        }
      }
      onBrushSelChange(null);
    }
    const brushHandlers = { onPointerDown: handleBrushDown, onPointerMove: handleBrushMove, onPointerUp: handleBrushUp, onPointerCancel: handleBrushUp };
    const miniMap = isZoomedIn && miniDragRef && (
      <MiniMap layers={bandsFull.map((b) => ({ values: b.values, color: b.color, mode: b.mode }))}
        total={total} winLen={winLen} start={start} maxStart={maxStart}
        panStart={panStart} onPanChange={onPanChange} dragRef={miniDragRef} accentColor={accentColor} />
    );
    const chartInner = (
      <div {...(selectMode ? brushHandlers : (isZoomedIn ? panHandlers : {}))} style={{ position: "relative", width: "100%", height: fill ? "100%" : totalH, touchAction: "pan-y", cursor: selectMode ? "crosshair" : isZoomedIn ? "grab" : "default", outline: selectMode ? `2px dashed ${accentColor}` : "none", outlineOffset: 2, borderRadius: 4 }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${w} ${totalH}`} preserveAspectRatio="none" style={{ display: "block" }}>
          {ticks.map((t) => (
            <line key={t.label} x1={t.frac * w} x2={t.frac * w} y1={0} y2={totalH} stroke={T.line} strokeWidth="1" />
          ))}
          {/* A visible line between each band, not just empty gap space —
              otherwise it's hard to tell where one channel's trace ends and
              the next one's begins, especially with a busy overlay. */}
          {bands.slice(0, -1).map((_, bi) => {
            const dividerY = bi * (bandH + gap) + bandH + gap / 2;
            return <line key={`div-${bi}`} x1={0} x2={w} y1={dividerY} y2={dividerY} stroke={T.line} strokeWidth="1.5" />;
          })}
          {bands.map((b, bi) => {
            const y0 = bi * (bandH + gap), y1 = y0 + bandH;
            const barW = w / b.values.length;
            return (
              <g key={selectedChannels[bi]}>
                {b.mode === "line" ? (
                  <path d={`M ${bandPath(b.values, y0, y1, w)}`} fill="none" stroke={b.color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  b.values.map((v, i) => v > 0.02 ? (
                    <rect key={i} x={i * barW + barW * 0.3} y={y1 - v * (bandH - 2)} width={Math.max(1, barW * 0.4)} height={v * (bandH - 2)} fill={b.color} />
                  ) : null)
                )}
              </g>
            );
          })}
        </svg>
        {/* Event markers rendered as real HTML dots, not SVG shapes inside the
            (non-uniformly stretched) chart coordinate space — svg circles get
            squashed into ellipses whenever the chart's rendered aspect ratio
            differs from its viewBox, which is common once height can flex
            independently of width (e.g. fullscreen landscape). */}
        {flowBandIndex !== -1 && visEvents.map((e, i) => (
          <div key={i} onPointerDown={(ev) => ev.stopPropagation()}
            onClick={() => onZoomChange && jumpToEvent(e.origX, total, SYNC_WINDOW_FRACS[SYNC_WINDOW_FRACS.length - 1], SYNC_WINDOW_FRACS[SYNC_WINDOW_FRACS.length - 1], onZoomChange, onPanChange)}
            style={{
              position: "absolute", left: `${e.x * 100}%`, top: `${((flowBandIndex * (bandH + gap) + 7) / totalH) * 100}%`, cursor: onZoomChange ? "pointer" : "default",
              transform: "translate(-50%, -50%)", width: 8, height: 8, borderRadius: "50%",
              background: EVENT_COLOR[e.type], border: `1.5px solid ${T.surface}`,
            }} />
        ))}
        {brushSel && selectMode && (() => {
          const a = Math.min(brushSel.a, brushSel.b), b = Math.max(brushSel.a, brushSel.b);
          return <div style={{ position: "absolute", top: 0, bottom: 0, left: `${a * 100}%`, width: `${(b - a) * 100}%`, background: hexA(accentColor, 0.18), border: `1.5px solid ${accentColor}`, pointerEvents: "none" }} />;
        })()}
      </div>
    );
    // Each band has its own scale (Flow 0-1, Leak 0-25, Tidal Volume 0-1500...)
    // so the axis gutter labels every band separately rather than showing one
    // shared scale for the whole stack.
    const gutter = (
      <div style={{ position: "relative", width: 28, height: fill ? "100%" : totalH, flexShrink: 0 }}>
        {bandsFull.map((b, bi) => {
          const y0 = bi * (bandH + gap), y1 = y0 + bandH;
          return (
            <div key={selectedChannels[bi]}>
              <span className="font-display" style={{ position: "absolute", top: `${(y0 / totalH) * 100}%`, left: 0, fontSize: 9, fontWeight: 600, color: T.muted }}>{b.axisMax}</span>
              <span className="font-display" style={{ position: "absolute", top: `${(y1 / totalH) * 100}%`, left: 0, transform: "translateY(-100%)", fontSize: 9, fontWeight: 600, color: T.muted }}>0</span>
            </div>
          );
        })}
      </div>
    );
    // One shared Info toggle now (in the header) covers every active band at
    // once, rather than a separate tiny button per band — deliberately
    // minimal content still applies: full name and unit only, no lengthy
    // description, since up to 3 bands share this card's height. That's
    // what the channel's own individual chart is for, one tap away via
    // "Individual channels".
    const infoOverlay = showInfo && (
      <>
        {bandsFull.map((b, bi) => {
          const y0 = bi * (bandH + gap), y1 = y0 + bandH;
          return (
            <div key={selectedChannels[bi]} onClick={() => onShowInfoChange(false)} style={{
              position: "absolute", top: `${(y0 / totalH) * 100}%`, height: `${(bandH / totalH) * 100}%`, left: 0, right: 0,
              background: T.surface, border: `1.5px solid ${b.color}`, borderRadius: 10,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              padding: "4px 10px", textAlign: "center", cursor: "pointer",
            }}>
              <span className="font-display" style={{ fontSize: 12, fontWeight: 700, color: b.color }}>{b.fullLabel || b.label}</span>
              {b.unitLabel && <span style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>{b.unitLabel}</span>}
            </div>
          );
        })}
      </>
    );
    const chart = (
      <div style={{ display: "flex", gap: 8, width: "100%", height: fill ? "100%" : totalH }}>
        {gutter}
        <div style={{ flex: 1, position: "relative" }}>{chartInner}{infoOverlay}</div>
      </div>
    );
    if (fill) {
      return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div style={{ flex: 1, minHeight: 0 }}>{chart}</div>
          <div style={{ position: "relative", height: 14, marginTop: 8, flexShrink: 0 }}>
            {ticks.map((t) => (
              <span key={t.label} className="font-display" style={{ position: "absolute", left: `${t.frac * 100}%`, transform: t.frac < 0.05 ? "none" : t.frac > 0.95 ? "translateX(-100%)" : "translateX(-50%)", fontSize: 10, fontWeight: 600, color: T.muted, whiteSpace: "nowrap" }}>{t.label}</span>
            ))}
          </div>
          {miniMap && <div style={{ flexShrink: 0 }}>{miniMap}</div>}
        </div>
      );
    }
    return (
      <>
        {chart}
        <div style={{ position: "relative", height: 14, marginTop: 8 }}>
          {ticks.map((t) => (
            <span key={t.label} className="font-display" style={{ position: "absolute", left: `${t.frac * 100}%`, transform: t.frac < 0.05 ? "none" : t.frac > 0.95 ? "translateX(-100%)" : "translateX(-50%)", fontSize: 10, fontWeight: 600, color: T.muted, whiteSpace: "nowrap" }}>{t.label}</span>
          ))}
        </div>
        {miniMap}
      </>
    );
  }
  const LegendRow = () => (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14, flexWrap: "wrap" }}>
      {selectedChannels.map((k) => (
        <span key={`ch-${k}`} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: T.muted }}>
          <span style={{ width: 12, height: 2, borderRadius: 1, background: CHANNEL_REGISTRY[k].color }} />{CHANNEL_REGISTRY[k].label}
        </span>
      ))}
      {selectedChannels.includes("flow") && Object.entries(EVENT_COLOR).map(([label, c]) => (
        <span key={`ev-${label}`} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: T.muted }}>
          <span style={{ width: 8, height: 8, borderRadius: 4, background: c }} />{label}
        </span>
      ))}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: T.surface, borderRadius: 22, padding: "16px 16px 18px" }}>
        <div className="no-scrollbar" style={{ display: "flex", gap: 6, overflowX: "auto", padding: "3px 4px" }}>
          {recentWindow.map((n) => {
            const ni = nights.indexOf(n);
            const active = ni === idx;
            return (
              <button key={ni} ref={active ? activePickerRef : null} onClick={() => setIdx(ni)} style={{ flexShrink: 0, width: 40 }}>
                <div style={{
                  height: 44, borderRadius: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1,
                  background: n.noUsage ? T.bg : scoreColor(n.ahi, targets),
                  border: n.noUsage ? `1.5px dashed ${T.muted}` : "none",
                  outline: active ? `2px solid ${T.ink}` : "none", outlineOffset: 1,
                  boxSizing: "border-box", opacity: active ? 1 : 0.4,
                }}>
                  <span className="font-display" style={{ fontSize: 9, fontWeight: 700, color: n.noUsage ? T.muted : "rgba(255,255,255,0.75)" }}>{n.wd}</span>
                  <span className="font-display" style={{ fontSize: 13, fontWeight: 700, color: n.noUsage ? T.muted : "#FFFFFF" }}>{n.label.split(" ")[0]}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => setIdx((i) => Math.max(0, i - 1))} style={{ width: 32, height: 32, borderRadius: "50%", background: T.surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ChevronLeft size={16} style={{ color: T.ink }} />
        </button>
        <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>{new Date(`${night.date}T00:00:00`).toLocaleDateString(undefined, { weekday: "long" })} {night.fullLabel}</div>
        <button onClick={() => setIdx((i) => Math.min(nights.length - 1, i + 1))} style={{ width: 32, height: 32, borderRadius: "50%", background: T.surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ChevronRight size={16} style={{ color: T.ink }} />
        </button>
      </div>

      <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
        <CardTitle>Night summary</CardTitle>
        <div style={{ margin: "12px 0 4px" }}>
          <EventRing night={night} size={140} />
        </div>
        <StatRow icon={Clock} iconColor={C.blue} label="Usage" value={`${night.usage}h`}
          description="Time your machine was actively delivering therapy. Most guidelines treat 4+ hours as a full night of therapeutic use." />
        <StatRow icon={Gauge} iconColor={C.orange} label="Set pressure" value={`${EQUIPMENT.fixedPressure} cmH₂O`}
          description="Your fixed prescribed pressure. Tonight's delivered range stayed within a fraction of this, as expected for a non-auto-adjusting machine." />
        <StatRow icon={LeakIcon} iconColor={C.purple} label="Avg leak" value={`${night.leak} L/min`}
          description="Air escaping around the mask edge rather than through it. Under ~24 L/min is generally considered an acceptable seal; consistently higher is worth checking your mask fit." />
        <StatRow icon={Clock} iconColor={C.pink} label="Time in apnea" value={`${fmtDuration(timeInApneaSec)} (${apneaPct.toFixed(2)}%)`} last
          description="Total time spent within a scored obstructive, central, or hypopnea event tonight — a duration-based view alongside AHI's per-hour event count." />
      </div>

      <TagsCard night={night} onOpenTagEntry={onOpenTagEntry} />

      <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>Synchronized view</span>
          <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
            <ChartInfoButton show={syncShowInfo} onToggle={() => setSyncShowInfo((s) => !s)} size={32} />
            <button onClick={() => { setSyncSelectMode((s) => !s); }}
              style={{ width: 32, height: 32, borderRadius: "50%", background: syncSelectMode ? T.ink : T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Crosshair size={13} style={{ color: syncSelectMode ? "#FFFFFF" : T.ink }} />
            </button>
            {syncZoom < 0.999 && (
              <button onClick={() => { setSyncZoom(1); setSyncPan(0); }}
                style={{ width: 32, height: 32, borderRadius: "50%", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ZoomOut size={13} style={{ color: T.ink }} />
              </button>
            )}
            <button onClick={() => setExpandedChart("sync")} style={{ width: 32, height: 32, borderRadius: "50%", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Maximize2 size={13} style={{ color: T.ink }} />
            </button>
          </div>
        </div>
        <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>Choose up to 3 channels to overlay</div>
        <div className="no-scrollbar" style={{ display: "flex", justifyContent: "center", overflowX: "auto", marginTop: 12, paddingBottom: 2 }}>
          <Segmented options={CHANNEL_GROUPS.map((g) => ({ key: g.label, label: g.label }))} active={activeGroup} onChange={setActiveGroup} />
        </div>
        <div className="no-scrollbar" style={{ display: "flex", justifyContent: "center", gap: 6, overflowX: "auto", marginTop: 8, paddingBottom: 2 }}>
          {CHANNEL_GROUPS.find((g) => g.label === activeGroup).keys.map((key) => {
            const ch = CHANNEL_REGISTRY[key];
            const active = selectedChannels.includes(key);
            return (
              <button key={key} onClick={() => toggleChannel(key)} style={{
                flexShrink: 0, padding: "6px 12px", borderRadius: 20, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center",
                background: active ? ch.color : T.bg,
                border: active ? "none" : `1px solid ${T.line}`,
              }}>
                <span className="font-display" style={{ fontSize: 12, fontWeight: 600, color: active ? "#FFFFFF" : T.muted, whiteSpace: "nowrap" }}>{ch.label}</span>
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 14 }}>
          <SyncChart bandH={64} gap={16} w={300} zoom={syncZoom} panStart={syncPan} onPanChange={setSyncPan} onZoomChange={setSyncZoom} dragRef={syncDragRef} miniDragRef={syncMiniDragRef}
            selectMode={syncSelectMode} onSelectModeChange={setSyncSelectMode} brushSel={syncBrushSel} onBrushSelChange={setSyncBrushSel} brushRef={syncBrushRef}
            showInfo={syncShowInfo} onShowInfoChange={setSyncShowInfo} />
        </div>
        <LegendRow />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 4px" }}>
        <span className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>Individual channels</span>
        <div style={{ display: "flex", gap: 8 }}>
          {!reorderMode && (
            <button onClick={() => setChartsLinked((s) => !s)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20,
              background: chartsLinked ? C.blue : T.surface, border: chartsLinked ? "none" : `1px solid ${T.line}`,
            }}>
              <Link2 size={13} style={{ color: chartsLinked ? "#FFFFFF" : T.muted }} />
              <span className="font-display" style={{ fontSize: 12, fontWeight: 600, color: chartsLinked ? "#FFFFFF" : T.muted }}>Sync zoom</span>
            </button>
          )}
          <button onClick={() => setReorderMode((s) => !s)} style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20,
            background: reorderMode ? C.blue : T.surface, border: reorderMode ? "none" : `1px solid ${T.line}`,
          }}>
            {!reorderMode && <ArrowUpDown size={13} style={{ color: T.muted }} />}
            <span className="font-display" style={{ fontSize: 12, fontWeight: 600, color: reorderMode ? "#FFFFFF" : T.muted }}>{reorderMode ? "Done" : "Reorder"}</span>
          </button>
        </div>
      </div>

      {reorderMode ? (
        <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
          {channelOrder.map((key, idx) => {
            const ch = CHANNEL_REGISTRY[key];
            return (
              <div key={key} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", height: 52,
                borderBottom: idx === channelOrder.length - 1 ? "none" : `1px solid ${T.line}`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 5, background: ch.color, flexShrink: 0 }} />
                  <span className="font-display" style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{ch.fullLabel || ch.label}</span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => moveChannel(idx, -1)} disabled={idx === 0}
                    style={{ width: 32, height: 32, borderRadius: "50%", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", opacity: idx === 0 ? 0.3 : 1 }}>
                    <ChevronUp size={15} style={{ color: T.ink }} />
                  </button>
                  <button onClick={() => moveChannel(idx, 1)} disabled={idx === channelOrder.length - 1}
                    style={{ width: 32, height: 32, borderRadius: "50%", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center", opacity: idx === channelOrder.length - 1 ? 0.3 : 1 }}>
                    <ChevronDown size={15} style={{ color: T.ink }} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        channelOrder.map((key) => {
          const ch = CHANNEL_REGISTRY[key];
          const linkProps = chartsLinked
            ? { zoom: linkedZoom, onZoomChange: setLinkedZoom, panStart: linkedPan, onPanChange: setLinkedPan }
            : {};
          return (
            <MiniChart key={key} label={ch.label} sub={ch.sub} fullLabel={ch.fullLabel} unitLabel={ch.unitLabel} values={ch.values} color={ch.color} mode={ch.mode}
              axisMax={ch.axisMax} unit={ch.unit} decimals={ch.decimals ?? 1}
              usageHours={night.usage} startHour={night.startHour} onExpand={() => setExpandedChart(key)} events={events}
              {...linkProps} />
          );
        })
      )}

      <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
        <CardTitle>Statistics</CardTitle>
        <div style={{ display: "grid", gridTemplateColumns: "1.7fr repeat(4, 1fr)", columnGap: 6 }}>
          <div />
          {["Min", "Med", "95%", "99.5%"].map((h) => (
            <div key={h} style={{ fontSize: 10, fontWeight: 700, color: T.muted, textAlign: "right", paddingBottom: 8 }}>{h}</div>
          ))}
          {statRows.map((row, i) => (
            <React.Fragment key={row.label}>
              {i > 0 && <div style={{ gridColumn: "1 / -1", borderTop: `1px solid ${T.line}` }} />}
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: i === 0 ? "0 0 10px" : "10px 0" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: T.ink, lineHeight: 1.3 }}>{row.label}</span>
                {row.unit && <span style={{ fontSize: 10, color: T.muted, lineHeight: 1.3, marginTop: 1 }}>{row.unit.trim()}</span>}
              </div>
              {[row.min, row.med, row.p95, row.p995].map((v, j) => (
                <div key={j} className="font-display" style={{
                  fontSize: 13, fontWeight: 600, color: T.ink, lineHeight: 1.3, display: "flex", alignItems: "center", justifyContent: "flex-end",
                  padding: i === 0 ? "0 0 10px" : "10px 0",
                }}>
                  {v.toFixed(row.decimals)}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      {expandedChart && (() => {
        const meta = expandedChart === "sync" ? null : CHANNEL_REGISTRY[expandedChart];
        return (
          <div style={{ position: "fixed", inset: 0, background: T.bg, zIndex: 50, padding: "20px 16px", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
              <div className="font-display" style={{ fontSize: 16, fontWeight: 700, color: T.ink }}>
                {night.label} · {expandedChart === "sync" ? "Synchronized view" : (meta.fullLabel || meta.label)}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {expandedChart === "sync" && (
                  <>
                    <ChartInfoButton show={syncShowInfo} onToggle={() => setSyncShowInfo((s) => !s)} size={32} />
                    <button onClick={() => setSyncSelectMode((s) => !s)}
                      style={{ width: 32, height: 32, borderRadius: "50%", background: syncSelectMode ? T.ink : T.surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Crosshair size={14} style={{ color: syncSelectMode ? "#FFFFFF" : T.ink }} />
                    </button>
                    {syncZoom < 0.999 && (
                      <button onClick={() => { setSyncZoom(1); setSyncPan(0); }}
                        style={{ width: 32, height: 32, borderRadius: "50%", background: T.surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <ZoomOut size={14} style={{ color: T.ink }} />
                      </button>
                    )}
                  </>
                )}
                <button onClick={() => setExpandedChart(null)} style={{ width: 40, height: 40, borderRadius: "50%", background: T.surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <X size={17} style={{ color: T.ink }} />
                </button>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex" }}>
              <div style={{ background: T.surface, borderRadius: 22, padding: 20, flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                {expandedChart === "sync" ? (
                  <>
                    <div style={{ flex: 1, minHeight: 0 }}>
                      <SyncChart bandH={160} gap={28} w={800} zoom={syncZoom} panStart={syncPan} onPanChange={setSyncPan} onZoomChange={setSyncZoom} dragRef={syncDragRef} miniDragRef={syncMiniDragRef} fill
                        selectMode={syncSelectMode} onSelectModeChange={setSyncSelectMode} brushSel={syncBrushSel} onBrushSelChange={setSyncBrushSel} brushRef={syncBrushRef}
                        showInfo={syncShowInfo} onShowInfoChange={setSyncShowInfo} />
                    </div>
                    <div style={{ flexShrink: 0 }}><LegendRow /></div>
                  </>
                ) : (
                  <div style={{ flex: 1, minHeight: 0 }}>
                    <BigChannelChart values={meta.values} color={meta.color} mode={meta.mode} axisMax={meta.axisMax} unit={meta.unit} decimals={meta.decimals ?? 1}
                      usageHours={night.usage} startHour={night.startHour} events={events} sub={meta.sub} label={meta.label} fullLabel={meta.fullLabel} unitLabel={meta.unitLabel} />
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
// A no-usage night has no waveform, no events, nothing to chart — showing
// DrillDownScreenNight for one would previously fall back to fabricating a
// synthetic "clean" night (mkEvents({obstructive:0,...}) still runs, hrs
// defaults via `night.usage || 7`), which reads as an unusually good night
// rather than as no data at all. This wrapper decides before any hooks run,
// so the two very different render paths (full charts vs. a plain message)
// never conflict with React's rules of hooks.
function DrillDownScreenNight_NotUsed({ nights, idx, setIdx, targets, onOpenTagEntry }) {
  const night = nights[idx];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => setIdx((i) => Math.max(0, i - 1))} style={{ width: 32, height: 32, borderRadius: "50%", background: T.surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ChevronLeft size={16} style={{ color: T.ink }} />
        </button>
        <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>{new Date(`${night.date}T00:00:00`).toLocaleDateString(undefined, { weekday: "long" })} {night.fullLabel}</div>
        <button onClick={() => setIdx((i) => Math.min(nights.length - 1, i + 1))} style={{ width: 32, height: 32, borderRadius: "50%", background: T.surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ChevronRight size={16} style={{ color: T.ink }} />
        </button>
      </div>
      <div style={{ background: T.surface, borderRadius: 22, padding: 32, textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", border: `2px dashed ${T.line}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
          <PowerOff size={22} style={{ color: T.muted }} strokeWidth={1.8} />
        </div>
        <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink, marginBottom: 6 }}>Not used this night</div>
        <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.5 }}>No session was recorded — nothing to show for AHI, leak, pressure, or waveform detail.</div>
      </div>
      <TagsCard night={night} onOpenTagEntry={onOpenTagEntry} />
    </div>
  );
}
// Shown on every night (used or not — a no-usage night still has context
// worth logging, like "away from home" often being exactly why the
// machine wasn't used) with an edit affordance opening the shared
// TagEntryScreen modal.
function TagsCard({ night, onOpenTagEntry }) {
  const manualTags = night.tags.filter((tk) => !AUTO_TAGS.has(tk));
  const autoTags = night.tags.filter((tk) => AUTO_TAGS.has(tk));
  const tagLabel = (tk) => (tk === "alcohol" && night.alcoholLevel ? `Alcohol (${night.alcoholLevel})` : TAG_LABEL[tk]);
  return (
    <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <CardTitle>Tags</CardTitle>
        <button onClick={() => onOpenTagEntry(night.date)} style={{ width: 32, height: 32, borderRadius: "50%", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Pencil size={13} style={{ color: T.ink }} />
        </button>
      </div>
      {night.tagStatus === "unreviewed" ? (
        <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>Not yet reviewed.</div>
      ) : manualTags.length === 0 && autoTags.length === 0 ? (
        <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>{night.tagStatus === "reviewed" ? "Nothing to report." : "No tags logged."}</div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          {[...manualTags, ...autoTags].map((tk) => {
            const Icon = TAG_ICON[tk];
            const color = TAG_COLOR[tk];
            return (
              <span key={tk} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px 6px 8px", borderRadius: 999, background: hexA(color, 0.14) }}>
                <Icon size={12} style={{ color }} />
                <span className="font-display" style={{ fontSize: 12, fontWeight: 600, color: T.ink }}>{tagLabel(tk)}</span>
                {AUTO_TAGS.has(tk) && <span style={{ fontSize: 9, fontWeight: 700, color: T.muted }}>AUTO</span>}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
function DrillDownScreen({ nights, idx, setIdx, targets, onOpenTagEntry }) {
  if (nights[idx].noUsage) return <DrillDownScreenNight_NotUsed nights={nights} idx={idx} setIdx={setIdx} targets={targets} onOpenTagEntry={onOpenTagEntry} />;
  return <DrillDownScreenNight nights={nights} idx={idx} setIdx={setIdx} targets={targets} onOpenTagEntry={onOpenTagEntry} />;
}

/* ---------- Something feel off? — guided troubleshooter ---------- */
function Troubleshooter({ nights, equipment }) {
  const [symptom, setSymptom] = useState(null);
  const avg = (arr, k) => arr.reduce((s, n) => s + n[k], 0) / arr.length;
  const last7 = nights.slice(-7);
  // AHI/leak on a no-usage night are zeroed placeholders, not real
  // readings, so they're excluded here — same avg/avgUsed split used
  // in Trends/Stats/Insights/ClinicianReport. Usage stays inclusive:
  // 0 hours is real signal for "how much are you actually using it."
  const last7Used = last7.filter((n) => !n.noUsage);
  const leakAvg = last7Used.length ? avg(last7Used, "leak") : 0;
  const ahiAvg = last7Used.length ? avg(last7Used, "ahi") : 0;
  const usageAvg = avg(last7, "usage");
  const cushionDays = daysAgo(equipment.cushionChanged);
  const headgearDays = daysAgo(equipment.headgearWashed);
  const totalMaskOff = nights.reduce((s, n) => s + n.maskOff, 0);

  const SYMPTOMS = [
    { key: "tired", label: "Tired / unrested" },
    { key: "dry", label: "Dry mouth/throat" },
    { key: "noise", label: "Noise" },
    { key: "leak", label: "Leak / whistling" },
    { key: "uncomfortable", label: "Mask uncomfortable" },
    { key: "gasping", label: "Waking up gasping" },
  ];
  const CAUSES = {
    tired: [
      { label: "Usage hours", detail: `Your 7-night average is ${usageAvg.toFixed(1)}h — most guidelines treat 4+ hours as a full night of therapeutic use, and falling short is the single most common cause of residual daytime tiredness on CPAP.` },
      { label: "Residual AHI", detail: `Your 7-night average AHI is ${ahiAvg.toFixed(1)} — even well-controlled therapy leaves some events, and those still fragment sleep even when you don't consciously wake for them.` },
    ],
    dry: [
      { label: "Pressure setting", detail: `Dry mouth or throat often points to mouth breathing at your set pressure of ${EQUIPMENT.fixedPressure} cmH₂O — worth discussing a humidity or pressure change with your clinician if it persists.` },
      { label: "Mask type", detail: "Full-face masks reduce dryness from mouth breathing compared to nasal masks, if that's a recurring issue for you." },
    ],
    noise: [
      { label: "Leak rate", detail: `Your 7-night average leak is ${leakAvg.toFixed(0)} L/min — whistling or hissing is almost always leak, not the machine itself.` },
      { label: "Hose seating", detail: "Check both ends of the hose are fully clicked in — a partial seat is a common, easy-to-miss noise source." },
    ],
    leak: [
      { label: "Cushion age", detail: `Your cushion was last changed ${cushionDays} days ago — silicone degrades over time and stops sealing as well.` },
      { label: "Headgear fit", detail: `Headgear last washed ${headgearDays} days ago — stretched-out straps are a common, overlooked leak cause.` },
    ],
    uncomfortable: [
      { label: "Cushion size", detail: `You're currently on a ${equipment.cushionSize} cushion — if it's newly uncomfortable, trying a different size often helps more than expected.` },
      { label: "Mask-off events", detail: `${totalMaskOff} mask-off events this month — recurring removal is usually a fit issue, not habit.` },
    ],
    gasping: [
      { label: "Recent AHI", detail: `Your 7-night average AHI is ${ahiAvg.toFixed(1)} — check the Trends tab for the specific night(s) driving it if this feels new.` },
      { label: "Worth flagging", detail: "Waking specifically gasping (rather than general restlessness) is worth mentioning to your clinician, since it can point to central rather than obstructive events." },
    ],
  };

  return (
    <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
      <CardTitle sub="Tap what you're noticing">Something feel off?</CardTitle>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {SYMPTOMS.map((s) => (
          <button key={s.key} onClick={() => setSymptom(symptom === s.key ? null : s.key)} className="font-display"
            style={{
              padding: "8px 14px", borderRadius: 999, fontSize: 13, fontWeight: 600,
              background: symptom === s.key ? C.blue : T.bg,
              color: symptom === s.key ? "#FFFFFF" : T.ink,
              border: `1px solid ${symptom === s.key ? C.blue : T.line}`,
            }}>
            {s.label}
          </button>
        ))}
      </div>
      {symptom && (
        <div style={{ marginTop: 16 }}>
          {CAUSES[symptom].map((c, i) => (
            <div key={i} style={{ padding: "12px 0", borderBottom: i === CAUSES[symptom].length - 1 ? "none" : `1px solid ${T.line}` }}>
              <div className="font-display" style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 3 }}>{c.label}</div>
              <div style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.5 }}>{c.detail}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Insights ---------- */
function InsightsScreen({ nights, onOpenReport, onNavigate, onSelectNight, targets, equipment }) {
  const last4 = nights.slice(-4);
  const leakUp = last4.every((n, i) => i === 0 || n.leak >= last4[i - 1].leak - 1);
  const cushionDaysForLeak = daysAgo(equipment.cushionChanged);
  const avg = (arr, k) => arr.reduce((s, n) => s + n[k], 0) / arr.length;
  const avgUsed = (arr, k) => {
    const used = arr.filter((n) => !n.noUsage);
    return used.length ? used.reduce((s, n) => s + n[k], 0) / used.length : 0;
  };
  const overall = avgUsed(nights, "ahi");
  const weekday = nights.filter((n) => !n.weekend), weekend = nights.filter((n) => n.weekend);
  const usedNights = nights.filter((n) => !n.noUsage);
  const best = usedNights.length ? usedNights.reduce((a, b) => (b.ahi < a.ahi ? b : a)) : null;
  const compliance = Math.round((nights.filter((n) => n.usage >= targets.usage).length / nights.length) * 100);
  const totalMaskOff = nights.reduce((s, n) => s + n.maskOff, 0);

  const tagInsights = Object.keys(TAG_LABEL).map((tk) => {
    const withTag = nights.filter((n) => !n.noUsage && n.tags.includes(tk));
    if (!withTag.length) return null;
    const a = avg(withTag, "ahi");
    const diff = overall ? Math.round(((a - overall) / overall) * 100) : 0;
    if (Math.abs(diff) < 10) return null;
    return { tk, diff, n: withTag.length };
  }).filter(Boolean);

  // trajectory: first half of the window vs second half
  const half = Math.floor(nights.length / 2);
  const firstHalf = nights.slice(0, half), secondHalf = nights.slice(half);
  const firstHalfAhi = avgUsed(firstHalf, "ahi");
  const trajDiff = firstHalfAhi ? Math.round(((avgUsed(secondHalf, "ahi") - firstHalfAhi) / firstHalfAhi) * 100) : 0;
  const improving = trajDiff < -5, worsening = trajDiff > 5;

  // combined-tag effect: alcohol + late meal together vs either alone
  const alcoholOnly = nights.filter((n) => n.tags.includes("alcohol") && !n.tags.includes("lateMeal"));
  const bothTags = nights.filter((n) => n.tags.includes("alcohol") && n.tags.includes("lateMeal"));
  const comboWorthShowing = bothTags.length >= 3 && alcoholOnly.length >= 3;
  const comboDiff = comboWorthShowing ? Math.round(((avg(bothTags, "ahi") - avg(alcoholOnly, "ahi")) / avg(alcoholOnly, "ahi")) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Troubleshooter nights={nights} equipment={equipment} />
      {worsening && (
        <NavCard icon={TrendingUp} dot={`linear-gradient(135deg,${C.orange},${C.red})`} title="Trending in the wrong direction"
          subtitle={`AHI up ${Math.abs(trajDiff)}% over this window — worth a closer look at what's changed recently`} onClick={() => onNavigate("trends")} />
      )}
      {improving && (
        <NavCard icon={Trophy} dot={`linear-gradient(135deg,${C.blue},${SEV.good})`} title="Trending in the right direction"
          subtitle={`AHI down ${Math.abs(trajDiff)}% over this window — whatever you're doing, keep it up`} onClick={() => onNavigate("trends")} />
      )}
      {leakUp && (
        <NavCard icon={TriangleAlert} dot={`linear-gradient(135deg,${C.orange},${C.red})`} title="Leak trending up"
          subtitle={cushionDaysForLeak > 60
            ? `4 nights running — your cushion is ${cushionDaysForLeak} days old, right in the range where seals typically start failing. Worth replacing it before troubleshooting anything else.`
            : "4 nights running — try reseating the mask and checking the lower straps first, since that's the most common cause of a slow drift"} onClick={() => onNavigate("trends")} />
      )}
      {totalMaskOff >= 3 && (
        <NavCard icon={PowerOff} dot={`linear-gradient(135deg,${C.purple},${C.pink})`} title="Mask coming off overnight"
          subtitle={`${totalMaskOff} mask-off events this month — if it's discomfort rather than accident, a different cushion size or style is worth trying`} onClick={() => onNavigate("equipment")} />
      )}
      {comboWorthShowing && Math.abs(comboDiff) >= 15 && (
        <NavCard icon={Sparkles} dot={`linear-gradient(135deg,${C.blue},${C.purple})`} title="Alcohol + late meal compounds"
          subtitle={`AHI runs ${comboDiff > 0 ? "+" : ""}${comboDiff}% higher when both happen the same night, vs. alcohol alone — worth avoiding the combination specifically`} onClick={() => onNavigate("stats")} />
      )}
      {tagInsights.map((ti) => (
        <NavCard key={ti.tk} icon={TAG_ICON[ti.tk]} dot={TAG_GRADIENT[ti.tk]}
          title={`${TAG_LABEL[ti.tk]} raises your AHI`}
          subtitle={`${ti.diff > 0 ? "+" : ""}${ti.diff}% vs. baseline, based on ${ti.n} nights${AUTO_TAGS.has(ti.tk) ? " · auto-detected" : ""}`} onClick={() => onNavigate("stats")} />
      ))}
      <NavCard icon={Calendar} dot={`linear-gradient(135deg,${C.blue},${C.pink})`} title="Weekends run higher"
        subtitle={`Weekday AHI ${avg(weekday, "ahi").toFixed(1)} vs. weekend ${avg(weekend, "ahi").toFixed(1)} — worth noticing what's different about your weekend routine`} onClick={() => onNavigate("stats")} />
      <NavCard icon={Sparkles} dot={`linear-gradient(135deg,${C.blue},${C.purple})`} title="Compliance is solid" subtitle={`Hitting 4+ hours on ${compliance}% of nights — usage isn't the thing to focus on right now`} onClick={() => onNavigate("stats")} />
      {best && (
        <NavCard icon={Trophy} dot={`linear-gradient(135deg,${C.orange},${C.red})`} title="Your best night" subtitle={`${best.label} — AHI ${best.ahi}. Worth remembering what was different that night`} onClick={() => onSelectNight(nights.indexOf(best))} />
      )}      <NavCard icon={Building2} dot={`linear-gradient(135deg,${C.blue},${C.purple})`} title="Clinician visit report" subtitle="A detailed, printable summary of your therapy for your next appointment" onClick={onOpenReport} />
    </div>
  );
}

/* ---------- Equipment ---------- */
function SelectRow({ label, value, children, last }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: last ? "none" : `1px solid ${T.line}` }}>
      <div onClick={() => setOpen((o) => !o)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 44, boxSizing: "border-box", cursor: "pointer" }}>
        <span className="font-display" style={{ fontSize: 14.5, color: T.ink }}>{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className="font-display" style={{ fontSize: 18, fontWeight: 700, color: T.ink }}>{value}</span>
          <ChevronRight size={14} style={{ color: T.muted, transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
        </div>
      </div>
      {open && <div style={{ paddingBottom: 14, display: "flex", justifyContent: "flex-end" }}>{children}</div>}
    </div>
  );
}
function MaintenanceRow({ icon: Icon, label, dateStr, onChange, intervalDays, description, last }) {
  const [open, setOpen] = useState(false);
  const days = daysAgo(dateStr);
  const color = dueColor(days, intervalDays);
  const overdue = days >= intervalDays;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div style={{ borderBottom: last ? "none" : `1px solid ${T.line}` }}>
      <div onClick={() => setOpen((o) => !o)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 44, boxSizing: "border-box", cursor: "pointer" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Icon size={18} style={{ color }} strokeWidth={1.8} />
          <span className="font-display" style={{ fontSize: 14.5, color: T.ink }}>{label}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {overdue && <TriangleAlert size={18} style={{ color: SEV.bad }} />}
          <span className="font-display" style={{ fontSize: 18, fontWeight: 700, color: T.ink }}>{days === 0 ? "Today" : `${days} days ago`}</span>
          <ChevronRight size={14} style={{ color: T.muted, transform: open ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
        </div>
      </div>
      {open && (
        <div style={{ paddingBottom: 14 }}>
          {description && <p className="font-display" style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.5, color: T.muted, margin: "0 0 12px" }}>{description}</p>}
          {overdue && (
            <p className="font-display" style={{ fontSize: 12.5, fontWeight: 600, color: SEV.bad, margin: "0 0 12px" }}>
              Past the typical replacement window — worth doing soon.
            </p>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <input type="date" value={dateStr} max={today} onChange={(e) => onChange(e.target.value)}
              style={{ flex: 1, padding: "9px 10px", borderRadius: 10, border: `1px solid ${T.line}`, fontFamily: "'Plus Jakarta Sans'", fontSize: 13, color: T.ink, background: T.bg }} />
            <button onClick={() => onChange(today)} className="font-display"
              style={{ padding: "9px 14px", borderRadius: 10, background: C.blue, color: "#FFFFFF", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap" }}>
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
function EquipmentScreen({ equipment, onChange }) {
  const set = (key) => (val) => onChange({ ...equipment, [key]: val });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 16 }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: `linear-gradient(135deg,${C.blue},${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
            <Fan size={30} style={{ color: "#FFFFFF" }} strokeWidth={1.8} />
          </div>
          <span className="font-display" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: T.muted, marginBottom: 2 }}>CPAP machine</span>
          <div className="font-display" style={{ fontSize: 16, fontWeight: 700, color: T.ink }}>{EQUIPMENT.machine.brand} {EQUIPMENT.machine.model}</div>
        </div>
        <StatRow icon={Hash} iconColor={T.muted} label="Serial number" value={EQUIPMENT.machine.serial} />
        <StatRow icon={RefreshCw} iconColor={T.muted} label="Last synced" value={EQUIPMENT.machine.lastSynced} />
        <StatRow icon={Gauge} iconColor={T.muted} label="Mode" value={EQUIPMENT.machine.mode} />
        <StatRow icon={Gauge} iconColor={T.muted} label="Pressure mode" value={EQUIPMENT.pressureMode === "fixed" ? `Fixed · ${EQUIPMENT.fixedPressure} cmH₂O` : "Auto"}
          description="A fixed-pressure machine delivers one constant pressure set by your clinician, rather than adjusting automatically through the night the way an APAP machine does." />
        <StatRow icon={Wind} iconColor={T.muted} label="EPR" value={`${EQUIPMENT.machine.epr} · ${EQUIPMENT.machine.eprLevel} cmH₂O`}
          description="Expiratory Pressure Relief slightly lowers pressure as you breathe out, making exhaling feel more natural." />
        <StatRow icon={TrendingUp} iconColor={T.muted} label="Ramp" value={EQUIPMENT.machine.ramp} />
        <MaintenanceRow icon={Wind} label="Filter changed" dateStr={equipment.filterChanged} onChange={set("filterChanged")} intervalDays={180}
          description="Most manufacturers recommend a reusable filter be rinsed monthly and replaced roughly every 6 months, or sooner in dusty environments. A disposable filter is generally replaced monthly." />
        <StatRow icon={Shield} iconColor={T.muted} label="Antibacterial filter" value={EQUIPMENT.machine.antibacterialFilter} />
        <StatRow icon={Droplets} iconColor={T.muted} label="Humidity level" value={EQUIPMENT.machine.humidityLevel} />
        <StatRow icon={Thermometer} iconColor={T.muted} label="Climate control" value={EQUIPMENT.machine.climateControl} />
        <StatRow icon={Droplets} iconColor={T.muted} label="Humidifier" value={EQUIPMENT.machine.humidifier} />
        <StatRow icon={Package} iconColor={T.muted} label="Essentials" value={EQUIPMENT.machine.essentials} last />
      </div>

      <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 16 }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: `linear-gradient(135deg,${C.pink},${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
            <VenetianMask size={30} style={{ color: "#FFFFFF" }} strokeWidth={1.8} />
          </div>
          <span className="font-display" style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: T.muted, marginBottom: 2 }}>Mask</span>
          <div className="font-display" style={{ fontSize: 16, fontWeight: 700, color: T.ink }}>{EQUIPMENT.mask.brand} {EQUIPMENT.mask.model}</div>
        </div>
        <SelectRow label="Cushion size" value={equipment.cushionSize}>
          <Segmented options={[{ key: "Small", label: "S" }, { key: "Medium", label: "M" }, { key: "Large", label: "L" }]} active={equipment.cushionSize} onChange={set("cushionSize")} />
        </SelectRow>
        <MaintenanceRow icon={RefreshCw} label="Cushion changed" dateStr={equipment.cushionChanged} onChange={set("cushionChanged")} intervalDays={90}
          description="Cushions lose their seal over time as the silicone breaks down. Most manufacturers suggest replacing every 2-3 months — sooner if you're noticing rising leak rates." />
        <MaintenanceRow icon={Droplets} label="Last cleaned" dateStr={equipment.lastCleaned} onChange={set("lastCleaned")} intervalDays={7}
          description="A daily rinse and a weekly proper wash keeps the silicone supple and free of skin oils, which extends the cushion's actual seal life — not just hygiene." />
        <MaintenanceRow icon={Droplets} label="Headgear washed" dateStr={equipment.headgearWashed} onChange={set("headgearWashed")} intervalDays={14} last
          description="Headgear straps lose elasticity with sweat and oils over time, which can show up as a gradually worsening seal even with a fresh cushion. Most guidance suggests washing every 1-2 weeks." />
      </div>
    </div>
  );
}

/* ---------- Clinician visit report — detailed, printable ---------- */
function ReportRow({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #E5E5EA" }}>
      <span style={{ fontSize: 13, color: "#57575F" }}>{label}</span>
      <span className="font-display" style={{ fontSize: 13, fontWeight: 700, color: "#0A0A0C" }}>{value}</span>
    </div>
  );
}
function ReportHeading({ children }) {
  return <h2 className="font-display" style={{ fontSize: 15, fontWeight: 800, color: "#0A0A0C", marginTop: 28, marginBottom: 10 }}>{children}</h2>;
}
function ReportBarChart({ data, dataKey, height = 90, max, colorFn, threshold, labelEvery = 5, logScale, logFloor = 0.3, logTicks }) {
  const m = max || Math.max(...data.map((d) => d[dataKey])) * 1.2;
  const w = 600;
  const barW = w / data.length;
  // logScale maps value->y with a floor (can't take log(0)) so no-events
  // nights sit flat at the bottom rather than at -infinity, and spans
  // enough range that a rare spike doesn't flatten every normal night
  // into an unreadable sliver the way a linear scale would.
  const yFor = (v) => {
    if (!logScale) return height - Math.max(1, (v / m) * height);
    const clamped = Math.max(logFloor, v);
    const frac = Math.log(clamped / logFloor) / Math.log(m / logFloor);
    return height * (1 - Math.max(0, Math.min(1, frac)));
  };
  const yTicks = logScale ? (logTicks || [1, 2, 4, 10, 20, 40]).filter((t) => t <= m) : [0, m * 0.25, m * 0.5, m * 0.75, m];
  return (
    <div style={{ display: "flex", gap: 6 }}>
      <div style={{ position: "relative", width: 20, height, flexShrink: 0 }}>
        {yTicks.map((t) => (
          <span key={t} style={{ position: "absolute", top: `${(yFor(t) / height) * 100}%`, transform: "translateY(-50%)", fontSize: 9, color: "#7C7C88" }}>
            {Number.isInteger(t) ? t : t.toFixed(1)}
          </span>
        ))}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <svg width="100%" height={height + 4} viewBox={`0 0 ${w} ${height + 4}`} preserveAspectRatio="none">
          {yTicks.map((t) => (
            <line key={t} x1={0} x2={w} y1={yFor(t)} y2={yFor(t)} stroke="#E5E5EA" strokeWidth="1" />
          ))}
          {threshold !== undefined && (
            <line x1={0} x2={w} y1={yFor(threshold)} y2={yFor(threshold)} stroke="#0A0A0C" strokeDasharray="4 3" strokeWidth="1" />
          )}
          {data.map((d, i) => {
            const cx = i * barW + barW * 0.5;
            if (d.noUsage) {
              return <circle key={i} cx={cx} cy={height - 2} r={Math.min(2.5, barW * 0.25)} fill="#0A0A0C" />;
            }
            const val = d[dataKey];
            const y = yFor(val);
            return <rect key={i} x={i * barW + barW * 0.15} y={y} width={barW * 0.7} height={height - y} fill={colorFn(d)} />;
          })}
        </svg>
        <div style={{ position: "relative", height: 12, marginTop: 4 }}>
          {data.map((d, i) => {
            if (i % labelEvery !== 0) return null;
            const frac = (i + 0.5) / data.length;
            return (
              <div key={i} style={{
                position: "absolute", left: `${frac * 100}%`, top: 0,
                transform: frac < 0.06 ? "none" : frac > 0.94 ? "translateX(-100%)" : "translateX(-50%)",
                fontSize: 9, color: "#7C7C88", whiteSpace: "nowrap",
            }}>{d.label}</div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
function ReportLegendDot({ color, label }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11, color: "#57575F", marginRight: 16 }}>
      <span style={{ width: 10, height: 10, background: color, display: "inline-block" }} />{label}
    </span>
  );
}
function ClinicianReportScreen({ nights, onBack, equipment }) {
  // Real history is whatever `nights` holds (the mockup's 30 nights). A
  // proper multi-window report needs up to 365 days to compare against, so
  // this screen synthesizes ~335 additional preceding nights, scoped
  // entirely to itself — nothing else in the app (Stats' "30-night
  // average" copy, Trends' month view, etc.) sees or is affected by this.
  // In the real build this whole block goes away; there's just more real
  // history to read as it accumulates.
  const fullHistory = useMemo(() => {
    const extra = [];
    const today = new Date(`${nights[0].date}T00:00:00`);
    const tagPool = ["alcohol", "lateMeal", "awayFromHome", "highStress", "illness"];
    for (let i = 335; i >= 1; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const weekend = d.getDay() === 0 || d.getDay() === 6;
      const noUsage = Math.random() < 0.03;
      const alcohol = !noUsage && Math.random() < 0.15;
      const ahi = noUsage ? 0 : Math.max(0.2, (alcohol ? 4.8 : weekend ? 2.9 : 2.2) + (Math.random() - 0.5) * 2.2);
      const obstructive = noUsage ? 0 : ahi * (0.55 + Math.random() * 0.15);
      const central = noUsage ? 0 : ahi * (0.1 + Math.random() * 0.1);
      const hypopnea = noUsage ? 0 : Math.max(0, ahi - obstructive - central);
      const leak = noUsage ? 0 : Math.round(Math.max(2, 10 + (Math.random() - 0.5) * 12));
      const usage = noUsage ? 0 : +(Math.max(2.5, 6.6 + (Math.random() - 0.5) * 3)).toFixed(1);
      const tags = noUsage ? [] : tagPool.filter(() => Math.random() < 0.08);
      if (alcohol) tags.push("alcohol");
      extra.push({
        label: d.toLocaleDateString(undefined, { day: "2-digit", month: "short" }),
        date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
        weekend, ahi: +ahi.toFixed(1), obstructive: +obstructive.toFixed(1), central: +central.toFixed(1), hypopnea: +hypopnea.toFixed(1),
        leak, usage, tags: [...new Set(tags)], noUsage,
      });
    }
    return [...extra, ...nights];
  }, [nights]);

  const pctl = (arr, p) => {
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  };
  const fmtHM = (h) => {
    const totalMin = Math.round(h * 60);
    const hh = Math.floor(totalMin / 60), mm = totalMin % 60;
    return `${hh} hour${hh === 1 ? "" : "s"} ${mm} minute${mm === 1 ? "" : "s"}`;
  };
  // 4h/6h are standard clinical/insurance compliance thresholds — kept
  // fixed here rather than tied to the user's own configurable target
  // below, since a clinician report should read against the standard
  // benchmark, not a personal setting that may differ from it.
  function windowStats(win) {
    const used = win.filter((n) => !n.noUsage);
    const usageAvg = win.reduce((s, n) => s + n.usage, 0) / win.length; // 0-usage nights count as real signal, same avg/avgUsed split used everywhere else in the app
    const ahiAvg = used.length ? used.reduce((s, n) => s + n.ahi, 0) / used.length : 0;
    const leak95 = pctl(used.map((n) => n.leak), 0.95);
    const days4 = win.filter((n) => n.usage >= 4).length;
    const days6 = win.filter((n) => n.usage >= 6).length;
    return { usageAvg, ahiAvg, leak95, days4, days4Pct: Math.round((days4 / win.length) * 100), days6, days6Pct: Math.round((days6 / win.length) * 100) };
  }
  const windows = [
    { key: "30", label: "Last 30 days", data: fullHistory.slice(-30), labelEvery: 5 },
    { key: "90", label: "Last 90 days", data: fullHistory.slice(-90), labelEvery: 14 },
    { key: "365", label: "Last 365 days", data: fullHistory.slice(-365), labelEvery: 56 },
  ];

  // Tag correlation, computed over the 90-day window — long enough for a
  // meaningful sample per tag, recent enough to reflect current patterns.
  // This is the one section a device-generated report structurally can't
  // include, since it doesn't know about the user's own logged context.
  const tagBase = windows[1].data.filter((n) => !n.noUsage);
  const overallAhi90 = tagBase.length ? tagBase.reduce((s, n) => s + n.ahi, 0) / tagBase.length : 0;
  const tagRows = Object.keys(TAG_LABEL).map((tk) => {
    const withTag = tagBase.filter((n) => n.tags.includes(tk));
    if (!withTag.length) return null;
    const a = withTag.reduce((s, n) => s + n.ahi, 0) / withTag.length;
    const diff = overallAhi90 ? Math.round(((a - overallAhi90) / overallAhi90) * 100) : 0;
    return { tk, diff, n: withTag.length };
  }).filter(Boolean).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  const avgUsed = (arr, k) => {
    const used = arr.filter((n) => !n.noUsage);
    return used.length ? used.reduce((s, n) => s + n[k], 0) / used.length : 0;
  };
  const obs = avgUsed(nights, "obstructive"), cen = avgUsed(nights, "central"), hyp = avgUsed(nights, "hypopnea");
  const usedNights = nights.filter((n) => !n.noUsage);
  const best = usedNights.length ? usedNights.reduce((a, b) => (b.ahi < a.ahi ? b : a)) : null;
  const worst = usedNights.length ? usedNights.reduce((a, b) => (b.ahi > a.ahi ? b : a)) : null;
  const cushionDays = daysAgo(equipment.cushionChanged);
  const filterDays = daysAgo(equipment.filterChanged);

  return (
    <div style={{ background: "#FFFFFF", minHeight: "100vh", fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui" }}>
      <style>{`@media print { .no-print { display: none !important; } body { background: #fff; } }
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');
        .font-display { font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui; }`}</style>

      <div className="no-print" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 600, margin: "0 auto", padding: "20px 20px 0" }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 600, color: "#0A0A0C" }}>
          <ChevronLeft size={16} /> Back
        </button>
        <button onClick={() => window.print()} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 999, background: C.blue, color: "#FFFFFF", fontSize: 13, fontWeight: 700 }}>
          Print / Save PDF
        </button>
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 20px 60px" }}>
        <h1 className="font-display" style={{ fontSize: 24, fontWeight: 800, color: "#0A0A0C", marginBottom: 4 }}>CPAP Therapy Summary</h1>
        <p style={{ fontSize: 13, color: "#7C7C88", marginBottom: 4 }}>{EQUIPMENT.machine.brand} {EQUIPMENT.machine.model}, SN {EQUIPMENT.machine.serial}</p>
        <p style={{ fontSize: 12, color: "#9A9AA5" }}>Generated {new Date().toLocaleDateString()} · Not a substitute for clinical review</p>

        {windows.map((win) => {
          const stats = windowStats(win.data);
          return (
            <div key={win.key} style={{ marginTop: 28 }}>
              <div className="font-display" style={{ background: "#0A0A0C", color: "#FFFFFF", padding: "9px 12px", fontSize: 13, fontWeight: 700, borderRadius: 6 }}>
                {win.label} ({win.data.length} nights)
              </div>
              <div style={{ display: "flex", gap: 24, marginTop: 2 }}>
                <div style={{ flex: 1 }}>
                  <ReportRow label="Average usage" value={fmtHM(stats.usageAvg)} />
                  <ReportRow label="Leak 95th %" value={`${stats.leak95.toFixed(2)} L/min`} />
                  <ReportRow label="Average AHI" value={`${stats.ahiAvg.toFixed(2)} events/hr`} />
                </div>
                <div style={{ flex: 1 }}>
                  <ReportRow label="Days used ≥4h" value={`${stats.days4}/${win.data.length} (${stats.days4Pct}%)`} />
                  <ReportRow label="Days used ≥6h" value={`${stats.days6}/${win.data.length} (${stats.days6Pct}%)`} />
                </div>
              </div>

              <div className="font-display" style={{ fontSize: 13, fontWeight: 700, color: "#0A0A0C", marginTop: 14, marginBottom: 4 }}>Usage hours</div>
              <div style={{ marginBottom: 6 }}>
                <ReportLegendDot color="#7CB68C" label="≥4 hours" />
                <ReportLegendDot color="#C4453D" label="<4 hours" />
                <ReportLegendDot color="#0A0A0C" label="No usage" />
              </div>
              <ReportBarChart data={win.data} dataKey="usage" max={12} threshold={4} labelEvery={win.labelEvery} colorFn={(d) => (d.usage >= 4 ? "#7CB68C" : "#C4453D")} />

              <div className="font-display" style={{ fontSize: 13, fontWeight: 700, color: "#0A0A0C", marginTop: 14, marginBottom: 4 }}>Events per hour (AHI)</div>
              <ReportBarChart data={win.data} dataKey="ahi" logScale max={40} labelEvery={win.labelEvery} colorFn={() => "#7C4DE0"} />
            </div>
          );
        })}

        <ReportHeading>Tag correlation (last 90 days)</ReportHeading>
        {tagRows.length ? tagRows.map((r) => (
          <ReportRow key={r.tk} label={`${TAG_LABEL[r.tk]}${AUTO_TAGS.has(r.tk) ? " (auto-detected)" : ""} (${r.n} nights)`} value={`AHI ${r.diff > 0 ? "+" : ""}${r.diff}%`} />
        )) : (
          <ReportRow label="No tagged nights yet" value="—" />
        )}

        <ReportHeading>Event breakdown (avg/hr)</ReportHeading>
        <ReportRow label="Obstructive" value={obs.toFixed(1)} />
        <ReportRow label="Central" value={cen.toFixed(1)} />
        <ReportRow label="Hypopnea" value={hyp.toFixed(1)} />

        <ReportHeading>Best / worst night</ReportHeading>
        {best && worst ? (
          <>
            <ReportRow label={`Best (${best.label})`} value={`AHI ${best.ahi}`} />
            <ReportRow label={`Worst (${worst.label})`} value={`AHI ${worst.ahi}`} />
          </>
        ) : (
          <ReportRow label="No nights used" value="—" />
        )}

        <ReportHeading>Equipment</ReportHeading>
        <ReportRow label="Machine" value={`${EQUIPMENT.machine.brand} ${EQUIPMENT.machine.model}`} />
        <ReportRow label="Serial number" value={EQUIPMENT.machine.serial} />
        <ReportRow label="Pressure mode" value={EQUIPMENT.pressureMode === "fixed" ? `Fixed · ${EQUIPMENT.fixedPressure} cmH₂O` : "Auto"} />
        <ReportRow label="Filter changed" value={`${filterDays} days ago`} />
        <ReportRow label="Mask" value={`${EQUIPMENT.mask.brand} ${EQUIPMENT.mask.model}, ${equipment.cushionSize}`} />
        <ReportRow label="Cushion changed" value={`${cushionDays} days ago`} />

        <ReportHeading>Nightly log (last 30 days)</ReportHeading>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #0A0A0C" }}>
              {["Date", "AHI", "Leak", "Usage"].map((h) => (
                <th key={h} className="font-display" style={{ textAlign: h === "Date" ? "left" : "right", padding: "6px 4px", fontSize: 11, fontWeight: 700, color: "#57575F" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {nights.map((n, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #EDEDF0" }}>
                <td style={{ padding: "6px 4px", color: "#0A0A0C" }}>{n.label}</td>
                <td style={{ padding: "6px 4px", textAlign: "right", color: "#0A0A0C" }}>{n.ahi}</td>
                <td style={{ padding: "6px 4px", textAlign: "right", color: "#0A0A0C" }}>{n.leak}</td>
                <td style={{ padding: "6px 4px", textAlign: "right", color: "#0A0A0C" }}>{n.usage}h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Import ---------- */
// Ordered import stages — index also drives the checklist's done/current/pending
// states, so the two can never drift out of sync with each other.
const IMPORT_STAGES = ["reading", "summaries", "waveform", "pruning"];
const IMPORT_STAGE_LABEL = {
  reading: "Reading folder",
  summaries: "Parsing nightly summaries",
  waveform: "Parsing waveform detail",
  pruning: "Pruning data older than 90 days",
};
function ImportStageRow({ label, status }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0" }}>
      <div style={{
        width: 22, height: 22, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
        background: status === "done" ? SEV.good : status === "current" ? C.blue : T.bg,
      }}>
        {status === "done" && <Check size={13} style={{ color: "#FFFFFF" }} strokeWidth={3} />}
        {status === "current" && <RefreshCw size={12} className="spin" style={{ color: "#FFFFFF" }} strokeWidth={2.5} />}
      </div>
      <span className="font-display" style={{ fontSize: 13, fontWeight: status === "pending" ? 500 : 700, color: status === "pending" ? T.muted : T.ink }}>{label}</span>
    </div>
  );
}
function ImportScreen({ onBack }) {
  // idle -> reading -> summaries -> waveform -> pruning -> done -> (back to idle)
  const [stage, setStage] = useState("idle");
  const [waveformDone, setWaveformDone] = useState(0);
  const waveformTotal = 21; // a 3-week gap since the last import — every one of those nights is still well inside the 90-day window, so nothing was missed, just batched
  const prunedCount = 21; // same 3-week gap means ~3 weeks' worth of nights aged out the other end of the window this run
  const startedAtRef = useRef(null);
  const [lastImport, setLastImport] = useState({ date: "29 Aug 2026", nightsAdded: 1, pruned: 1, duration: "4s" });
  const [history, setHistory] = useState([
    { date: "29 Aug 2026", nights: "1 night" },
    { date: "22 Aug 2026", nights: "7 nights" },
    { date: "1 Aug 2026", nights: "30 nights (first import)" },
  ]);

  useEffect(() => {
    if (stage === "reading") {
      const t = setTimeout(() => setStage("summaries"), 1400);
      return () => clearTimeout(t);
    }
    if (stage === "summaries") {
      const t = setTimeout(() => setStage("waveform"), 900);
      return () => clearTimeout(t);
    }
    if (stage === "waveform") {
      if (waveformDone >= waveformTotal) {
        const t = setTimeout(() => setStage("pruning"), 400);
        return () => clearTimeout(t);
      }
      const t = setTimeout(() => setWaveformDone((n) => n + 1), 90);
      return () => clearTimeout(t);
    }
    if (stage === "pruning") {
      const t = setTimeout(() => {
        // The completion card and the persistent "Last import" card were
        // previously two disconnected sources of truth — this one just
        // finished importing waveformTotal nights, but the card below it
        // kept showing a hardcoded "1 night" regardless. Recording the
        // real numbers here (and the real elapsed time) keeps both in
        // sync, and history keeps a running log instead of a static list.
        const elapsedMs = startedAtRef.current ? Date.now() - startedAtRef.current : 0;
        const mins = Math.floor(elapsedMs / 60000), secs = Math.round((elapsedMs % 60000) / 1000);
        const durationStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
        const dateStr = new Date().toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
        setLastImport({ date: dateStr, nightsAdded: waveformTotal, pruned: prunedCount, duration: durationStr });
        setHistory((h) => [{ date: dateStr, nights: `${waveformTotal} nights` }, ...h]);
        setStage("done");
      }, 900);
      return () => clearTimeout(t);
    }
  }, [stage, waveformDone]);

  const isActive = stage !== "idle" && stage !== "done";

  // Best-effort screen wake lock while actively importing. This is not a
  // substitute for the warning shown below, only a supplement to it:
  // support varies by browser/OS version, the OS can revoke it anytime
  // (low battery, etc.), and — notably, since installing to the home
  // screen is how this app is meant to be used on iOS — installed
  // Home Screen web apps had a WebKit bug where wake lock silently did
  // nothing at all until iOS 18.4 fixed it. Wrapped in try/catch per
  // MDN's guidance since the request can reject for any of the above.
  useEffect(() => {
    if (!isActive) return;
    let cancelled = false;
    let sentinel = null;
    const acquire = async () => {
      try {
        if ("wakeLock" in navigator) sentinel = await navigator.wakeLock.request("screen");
      } catch {
        // Silently falls back to the on-screen warning — nothing to
        // recover from here, this path is expected on plenty of devices.
      }
    };
    acquire();
    // The lock is released automatically whenever the document goes
    // hidden (app backgrounded, screen locked) — re-acquiring on return
    // to visible is what the platform's own wake-lock demos recommend,
    // otherwise a single backgrounding permanently drops it for the
    // rest of the import even after the user comes back.
    const onVisibility = () => { if (!cancelled && document.visibilityState === "visible") acquire(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      sentinel?.release().catch(() => {});
    };
  }, [isActive]);

  const startImport = () => { setWaveformDone(0); startedAtRef.current = Date.now(); setStage("reading"); };
  const cancelImport = () => { setStage("idle"); setWaveformDone(0); };
  const handleBack = () => {
    // An accidental tap here mid-import would otherwise silently abandon
    // it with no warning — cheap to guard against given a real import
    // can run well over a minute, not the few seconds this mockup fakes.
    if (isActive && !window.confirm("Import still in progress — leave anyway?")) return;
    onBack();
  };
  const stageIdx = stage === "done" ? IMPORT_STAGES.length : IMPORT_STAGES.indexOf(stage);
  const stageDetail = {
    reading: "Scanning card contents…",
    summaries: "Reading STR.edf for your full history",
    waveform: `Night ${waveformDone} of ${waveformTotal}`,
    pruning: "Dropping waveform detail that's aged out",
  }[stage];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui", paddingBottom: 40 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');
        .font-display { font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui; }
        @keyframes import-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: import-spin 0.9s linear infinite; }`}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 12, maxWidth: 448, margin: "0 auto", padding: "20px 18px 8px" }}>
        <button onClick={handleBack} style={{ width: 36, height: 36, borderRadius: "50%", background: T.surface, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <ChevronLeft size={18} style={{ color: T.ink }} />
        </button>
        <div className="font-display" style={{ fontSize: 20, fontWeight: 800, color: T.ink }}>Import</div>
      </div>

      <main style={{ maxWidth: 448, margin: "0 auto", padding: "16px 18px 0", display: "flex", flexDirection: "column", gap: 16 }}>
        {stage === "idle" && (
          <div style={{ background: T.surface, borderRadius: 22, padding: 24, textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: `linear-gradient(135deg,${C.blue},${C.purple})`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Upload size={28} style={{ color: "#FFFFFF" }} strokeWidth={1.8} />
            </div>
            <div className="font-display" style={{ fontSize: 16, fontWeight: 700, color: T.ink, marginBottom: 6 }}>Import from SD card</div>
            <div style={{ fontSize: 13, color: T.muted, marginBottom: 18, lineHeight: 1.5 }}>Plug in your card reader, then select the card's root folder — the one containing STR.edf and DATALOG together.</div>
            <button onClick={startImport} style={{ width: "100%", padding: "13px 0", borderRadius: 999, background: C.blue, color: "#FFFFFF" }} className="font-display">
              <span style={{ fontSize: 14, fontWeight: 700 }}>Choose folder</span>
            </button>
            <div style={{ fontSize: 11, color: T.muted, marginTop: 10 }}>First import can take up to 20 minutes — it's reading full nightly summaries plus parsing 90 days of detailed waveform data, all in the browser. Later imports only process what's new, so they're much faster.</div>
          </div>
        )}

        {isActive && (
          <div style={{ background: T.surface, borderRadius: 22, padding: 24 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: C.blue, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <RefreshCw size={22} className="spin" style={{ color: "#FFFFFF" }} strokeWidth={2} />
              </div>
              <div className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink }}>{IMPORT_STAGE_LABEL[stage]}</div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 3 }}>{stageDetail}</div>
            </div>
            {stage === "waveform" && (
              <div style={{ marginTop: 16, height: 6, borderRadius: 3, background: T.bg, overflow: "hidden" }}>
                <div style={{ width: `${(waveformDone / waveformTotal) * 100}%`, height: "100%", background: C.blue, borderRadius: 3, transition: "width 0.15s linear" }} />
              </div>
            )}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${T.line}` }}>
              {IMPORT_STAGES.map((s, i) => (
                <ImportStageRow key={s} label={IMPORT_STAGE_LABEL[s]} status={i < stageIdx ? "done" : i === stageIdx ? "current" : "pending"} />
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginTop: 16, padding: 12, background: T.bg, borderRadius: 12 }}>
              <TriangleAlert size={15} style={{ color: T.muted, flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 12.5, color: T.muted, lineHeight: 1.4 }}>We try to keep your screen from locking automatically, but it's not guaranteed on every device — keep this screen open and avoid switching apps where you can. If you do get interrupted partway, nothing's lost: starting the import again picks up from where it left off rather than starting over.</span>
            </div>
            <button onClick={cancelImport} className="font-display" style={{ width: "100%", padding: "11px 0", borderRadius: 999, background: "none", marginTop: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.muted }}>Cancel import</span>
            </button>
          </div>
        )}

        {stage === "done" && (
          <div style={{ background: T.surface, borderRadius: 22, padding: 24, textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: SEV.good, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <Check size={24} style={{ color: "#FFFFFF" }} strokeWidth={3} />
            </div>
            <div className="font-display" style={{ fontSize: 16, fontWeight: 700, color: T.ink, marginBottom: 14 }}>Import complete</div>
            <div style={{ textAlign: "left" }}>
              <StatRow icon={Sparkles} iconColor={C.purple} label="Nights added" value={lastImport.nightsAdded} />
              <StatRow icon={HardDrive} iconColor={C.blue} label="Waveform parsed" value={`${lastImport.nightsAdded} nights`} />
              <StatRow icon={Package} iconColor={T.muted} label="Waveform pruned" value={`${lastImport.pruned} nights`} />
              <StatRow icon={Clock} iconColor={C.orange} label="Duration" value={lastImport.duration} last />
            </div>
            <button onClick={() => setStage("idle")} style={{ width: "100%", padding: "13px 0", borderRadius: 999, background: T.bg, marginTop: 16 }} className="font-display">
              <span style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>Done</span>
            </button>
          </div>
        )}

        <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
          <CardTitle sub="Rolling window, measured from today">What's kept</CardTitle>
          <StatRow icon={Sparkles} iconColor={C.purple} label="Nightly summaries" value="Kept forever"
            description="AHI, leak, usage, mask seal, tags and score — one lightweight record per night, from STR.edf. Small enough to keep your whole history without a second thought." />
          <StatRow icon={HardDrive} iconColor={C.blue} label="Waveform detail" value="Last 90 days" last
            description="Flow, pressure, snore and the other per-second channels from DATALOG — the heavy data. Anything older than 90 days is pruned automatically on each import; the summary for that night stays put, just without the full waveform to drill into." />
        </div>

        {!isActive && (
          <>
            <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
              <CardTitle>Last import</CardTitle>
              <StatRow icon={Calendar} iconColor={C.blue} label="Date" value={lastImport.date} />
              <StatRow icon={Sparkles} iconColor={C.purple} label="Nights added" value={lastImport.nightsAdded} />
              <StatRow icon={Package} iconColor={T.muted} label="Waveform pruned" value={`${lastImport.pruned} night${lastImport.pruned === 1 ? "" : "s"}`}
                description="Nights that aged out of the 90-day window this import. Their nightly summary is untouched — only the detailed waveform was dropped." />
              <StatRow icon={Clock} iconColor={C.orange} label="Duration" value={lastImport.duration} last />
            </div>

            <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
              <CardTitle>Import history</CardTitle>
              {history.map((h, i) => (
                <StatRow key={`${h.date}-${i}`} icon={Upload} iconColor={T.muted} label={h.date} value={h.nights} last={i === history.length - 1} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

/* ---------- Settings ---------- */
function StepperRow({ label, value, unit, onChange, step, min, max, last, formatValue }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 44, boxSizing: "border-box", borderBottom: last ? "none" : `1px solid ${T.line}` }}>
      <span className="font-display" style={{ fontSize: 14.5, color: T.ink }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))} style={{ width: 28, height: 28, borderRadius: "50%", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Minus size={13} style={{ color: T.ink }} />
        </button>
        <span className="font-display" style={{ fontSize: 15, fontWeight: 700, color: T.ink, minWidth: 64, textAlign: "center" }}>
          {formatValue ? formatValue(value) : <>{value} <span style={{ fontSize: 11, fontWeight: 500, color: T.muted }}>{unit}</span></>}
        </span>
        <button onClick={() => onChange(Math.min(max, +(value + step).toFixed(2)))} style={{ width: 28, height: 28, borderRadius: "50%", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Plus size={13} style={{ color: T.ink }} />
        </button>
      </div>
    </div>
  );
}
function SettingsScreen({ onBack, targets, onChange }) {
  const set = (key) => (val) => onChange({ ...targets, [key]: val });

  return (
    <div style={{ minHeight: "100vh", background: T.bg, fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui", paddingBottom: 40 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');
        .font-display { font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui; }`}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 12, maxWidth: 448, margin: "0 auto", padding: "20px 18px 8px" }}>
        <button onClick={onBack} style={{ width: 36, height: 36, borderRadius: "50%", background: T.surface, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <ChevronLeft size={18} style={{ color: T.ink }} />
        </button>
        <div className="font-display" style={{ fontSize: 20, fontWeight: 800, color: T.ink }}>Settings</div>
      </div>

      <main style={{ maxWidth: 448, margin: "0 auto", padding: "16px 18px 0", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
          <CardTitle sub="Drives your Today score, Stats targets, and the warning-triangle flags throughout the app">Targets</CardTitle>
          <StepperRow label="AHI target" value={targets.ahi} unit="events/hr" step={0.5} min={1} max={15} onChange={set("ahi")} />
          <StepperRow label="Leak target" value={targets.leak} unit="L/min" step={1} min={5} max={40} onChange={set("leak")} />
          <StepperRow label="Usage target" value={targets.usage} unit="hours" step={0.5} min={2} max={8} onChange={set("usage")} />
          <StepperRow label="Compliance target" value={targets.compliance} unit="%" step={5} min={50} max={100} onChange={set("compliance")} />
          <StepperRow label="Mask-off target" value={targets.maskOff} unit="events" step={1} min={0} max={10} onChange={set("maskOff")} last />
        </div>
        <div style={{ fontSize: 12, color: T.muted, padding: "0 4px", lineHeight: 1.5 }}>
          Meeting every target on the same night is what earns a 100 score on Today. Defaults match common clinical benchmarks (AHI under 5, 4+ hours on 70% of nights) — adjust if your clinician has given you different numbers to work toward.
        </div>

        <div style={{ background: T.surface, borderRadius: 22, padding: 20 }}>
          <CardTitle sub="Used only for the automatic 'Late start' tag">Tagging</CardTitle>
          <StepperRow label="Target bedtime" value={targets.bedtime} step={0.25} min={19} max={26} onChange={set("bedtime")}
            formatValue={(v) => <>{formatClock(v)}</>} last />
        </div>
        <div style={{ fontSize: 12, color: T.muted, padding: "0 4px", lineHeight: 1.5 }}>
          A session starting more than 2 hours after this is tagged "Late start" automatically — no logging needed, since your machine already records when a session began.
        </div>
      </main>
    </div>
  );
}

/* ---------- Splash screen ---------- */
/* ---------- Tag entry ---------- */
// "Yesterday" reads more naturally than a date when tagging the morning
// after — everywhere else falls back to a plain formatted date.
function formatTagDateLabel(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`);
  const yest = new Date(); yest.setDate(yest.getDate() - 1);
  const yestStr = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, "0")}-${String(yest.getDate()).padStart(2, "0")}`;
  return dateStr === yestStr ? "yesterday" : d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "long" });
}
// Shared modal for both entry points — same picker whether it's today's
// quick-tag or an edit opened from a past night in Night View, just a
// different date and pre-filled state going in.
function TagEntryScreen({ date, initialEntry, onSave, onClose }) {
  const [alcohol, setAlcohol] = useState(initialEntry?.alcohol || null);
  const [lateMeal, setLateMeal] = useState(initialEntry?.lateMeal || false);
  const [awayFromHome, setAwayFromHome] = useState(initialEntry?.awayFromHome || false);
  const [highStress, setHighStress] = useState(initialEntry?.highStress || false);
  const [illness, setIllness] = useState(initialEntry?.illness || false);
  const dateLabel = formatTagDateLabel(date);
  const save = () => onSave({ reviewed: true, alcohol, lateMeal, awayFromHome, highStress, illness });
  const saveNothing = () => onSave({ reviewed: true, alcohol: null, lateMeal: false, awayFromHome: false, highStress: false, illness: false });
  const Chip = ({ active, label, icon: Icon, color, onClick, last }) => (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 4px",
      borderBottom: last ? "none" : `1px solid ${T.line}`,
    }}>
      <div style={{ width: 30, height: 30, borderRadius: "50%", background: active ? color : T.bg, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={15} style={{ color: active ? "#FFFFFF" : T.muted }} />
      </div>
      <span className="font-display" style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>{label}</span>
      <div style={{ marginLeft: "auto", width: 22, height: 22, borderRadius: "50%", background: active ? color : T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {active && <Check size={13} style={{ color: "#FFFFFF" }} strokeWidth={3} />}
      </div>
    </button>
  );
  return (
    <div style={{ position: "fixed", inset: 0, background: T.bg, zIndex: 60, display: "flex", flexDirection: "column", fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');
        .font-display { font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui; }`}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 18px 8px", maxWidth: 448, margin: "0 auto", width: "100%", boxSizing: "border-box", flexShrink: 0 }}>
        <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: "50%", background: T.surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <X size={17} style={{ color: T.ink }} />
        </button>
        <div className="font-display" style={{ fontSize: 16, fontWeight: 800, color: T.ink }}>Tag {dateLabel}</div>
        <div style={{ width: 36 }} />
      </div>
      <main style={{ flex: 1, overflow: "auto", maxWidth: 448, margin: "0 auto", width: "100%", padding: "16px 18px 24px", boxSizing: "border-box" }}>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 18, lineHeight: 1.4 }}>
          What happened the night of {dateLabel}? This is what actually lets Stats and Insights tell you what's affecting your numbers.
        </div>

        <div style={{ background: T.surface, borderRadius: 22, padding: 20, marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: alcohol ? TAG_COLOR.alcohol : T.bg, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Wine size={15} style={{ color: alcohol ? "#FFFFFF" : T.muted }} />
            </div>
            <span className="font-display" style={{ fontSize: 14, fontWeight: 600, color: T.ink }}>Alcohol</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {[[null, "None"], ["light", "Light"], ["heavy", "Heavy"]].map(([key, label]) => {
              const active = alcohol === key;
              return (
                <button key={label} onClick={() => setAlcohol(key)} style={{ flex: 1, padding: "12px 0", borderRadius: 14, textAlign: "center", background: active ? TAG_COLOR.alcohol : T.bg }}>
                  <span className="font-display" style={{ fontSize: 13, fontWeight: 700, color: active ? "#FFFFFF" : T.ink }}>{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ background: T.surface, borderRadius: 22, padding: "4px 20px", marginBottom: 20 }}>
          <Chip active={lateMeal} label="Late meal" icon={UtensilsCrossed} color={TAG_COLOR.lateMeal} onClick={() => setLateMeal((v) => !v)} />
          <Chip active={awayFromHome} label="Away from home" icon={Plane} color={TAG_COLOR.awayFromHome} onClick={() => setAwayFromHome((v) => !v)} />
          <Chip active={highStress} label="High stress" icon={Zap} color={TAG_COLOR.highStress} onClick={() => setHighStress((v) => !v)} />
          <Chip active={illness} label="Congestion / illness" icon={Thermometer} color={TAG_COLOR.illness} onClick={() => setIllness((v) => !v)} last />
        </div>

        <button onClick={saveNothing} style={{ width: "100%", padding: "13px 0", borderRadius: 999, background: T.surface }}>
          <span className="font-display" style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>Nothing to report</span>
        </button>
        <button onClick={save} style={{ width: "100%", padding: "13px 0", borderRadius: 999, background: C.blue, marginTop: 10 }}>
          <span className="font-display" style={{ fontSize: 14, fontWeight: 700, color: "#FFFFFF" }}>Save</span>
        </button>
      </main>
    </div>
  );
}
function SplashScreen({ fadingOut }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100, background: "#FFFFFF",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      opacity: fadingOut ? 0 : 1, transition: "opacity 0.3s ease",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');
        .font-display { font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui; }`}</style>
      <img src={APP_LOGO} alt="" width={220} height={220} style={{ marginBottom: 22 }} />
      <div className="font-display" style={{ fontSize: 26, fontWeight: 800, color: T.ink, letterSpacing: "-0.01em" }}>{APP_NAME}</div>
      <div className="font-display" style={{ fontSize: 12, fontWeight: 600, color: T.muted, marginTop: 6 }}>v{APP_VERSION}</div>
    </div>
  );
}

export default function App() {
  const rawNights = useMockData();
  const toDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const [showReport, setShowReport] = useState(false);
  const [targets, setTargets] = useState(DEFAULT_TARGETS);
  const [splashStage, setSplashStage] = useState("visible"); // visible -> fading -> gone
  useEffect(() => {
    const t1 = setTimeout(() => setSplashStage("fading"), 1000);
    const t2 = setTimeout(() => setSplashStage("gone"), 1300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);
  const [equipment, setEquipment] = useState({
    cushionSize: EQUIPMENT.mask.cushionSize,
    cushionChanged: EQUIPMENT.mask.cushionChanged,
    lastCleaned: EQUIPMENT.mask.lastCleaned,
    headgearWashed: EQUIPMENT.mask.headgearWashed,
    filterChanged: EQUIPMENT.machine.filterChanged,
  });
  // Tags are keyed by calendar date, entirely separate from night/import
  // data — import (or, here, the mock generator) never owns or creates a
  // tag, it's just merged in below by date whenever both exist. Mock-only
  // seed: simulates "the user completed their first import 9 days ago"
  // (tagStartDate) with a few days already logged, and the most recent 2
  // nights left unreviewed so the Today prompt/nag has something real to
  // show. In the real build tagStartDate is set exactly once, the moment
  // the first import actually completes — nothing recomputed like this.
  const [tagStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 9);
    return toDateStr(d);
  });
  const [tagLog, setTagLog] = useState(() => {
    const seed = {};
    const mk = (daysAgo) => { const d = new Date(); d.setDate(d.getDate() - daysAgo); return toDateStr(d); };
    seed[mk(9)] = { reviewed: true, alcohol: "light", lateMeal: false, awayFromHome: false, highStress: false, illness: false };
    seed[mk(7)] = { reviewed: true, alcohol: null, lateMeal: false, awayFromHome: false, highStress: false, illness: false };
    seed[mk(6)] = { reviewed: true, alcohol: null, lateMeal: true, awayFromHome: false, highStress: true, illness: false };
    seed[mk(4)] = { reviewed: true, alcohol: null, lateMeal: false, awayFromHome: true, highStress: false, illness: false };
    // days -3 through -1 deliberately left unreviewed — this is the gap
    // the Today prompt/nag is meant to catch.
    return seed;
  });
  // Merges the raw (imported/mock) nights with the tag log by date. Any
  // night before tagStartDate is exempt from review-state tracking
  // entirely — first-import history can span a year or more, so treating
  // all of it as "unreviewed" would either nag uselessly for hundreds of
  // nights at once, or pretend accurate same-day recall is possible for
  // data that old. Exempt nights just carry whatever their own data has
  // (the mock's pre-existing random tags) with no status attached.
  const nights = useMemo(() => rawNights.map((n) => {
    const exempt = n.date < tagStartDate;
    const entry = tagLog[n.date];
    const status = exempt ? "exempt" : entry ? "reviewed" : "unreviewed";
    // An explicit edit always takes effect, even on an exempt night — the
    // user can still choose to retroactively tag older history via Night
    // View. Exemption only controls whether an *unedited* date counts
    // toward the nag/review tracking, not whether editing it works.
    let tags = entry ? [
      ...(entry.alcohol ? ["alcohol"] : []),
      ...(entry.lateMeal ? ["lateMeal"] : []),
      ...(entry.awayFromHome ? ["awayFromHome"] : []),
      ...(entry.highStress ? ["highStress"] : []),
      ...(entry.illness ? ["illness"] : []),
    ] : exempt ? n.tags : [];
    // Late start is auto-detected from the machine's own data (session
    // start vs. Target bedtime), independent of tagStartDate/review status
    // entirely — there's nothing to review for a number the device
    // already recorded, so it's just always there once a night has data.
    if (!n.noUsage && n.startHour > targets.bedtime + 2) tags = [...tags, "lateStart"];
    return { ...n, tags, tagStatus: status, alcoholLevel: entry ? entry.alcohol : null };
  }), [rawNights, tagLog, tagStartDate, targets.bedtime]);
  // Every date from tagStartDate through yesterday with no tagLog entry —
  // computed independent of rawNights entirely, since the whole point is
  // catching up on a date even if that night hasn't been imported yet.
  const untaggedDates = useMemo(() => {
    const out = [];
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1); yesterday.setHours(0, 0, 0, 0);
    for (const d = new Date(`${tagStartDate}T00:00:00`); d <= yesterday; d.setDate(d.getDate() + 1)) {
      const ds = toDateStr(d);
      if (!tagLog[ds]) out.push(ds);
    }
    return out;
  }, [tagLog, tagStartDate]);
  const [tagEntryDate, setTagEntryDate] = useState(null);
  const saveTagEntry = (entry) => { setTagLog((log) => ({ ...log, [tagEntryDate]: entry })); setTagEntryDate(null); };
  const [showImport, setShowImport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tab, setTab] = useState("today");
  const [nightIdx, setNightIdx] = useState(nights.length - 1);
  const goToNight = (i) => { setNightIdx(i); setTab("night"); };
  const tabs = [
    { key: "today", label: "Today", icon: Home },
    { key: "trends", label: "Trends", icon: TrendingUp },
    { key: "stats", label: "Stats", icon: BarChart3 },
    { key: "night", label: "Night View", icon: Moon },
    { key: "insights", label: "Insights", icon: Lightbulb },
    { key: "equipment", label: "Equipment", icon: LayoutGrid },
  ];
  // Derived from the actual last night's date rather than hardcoded — the
  // mock data itself is anchored to the real current date, so a fixed
  // string here would silently drift out of sync with it (and already had).
  const lastNight = nights[nights.length - 1];
  const todayTitle = lastNight
    ? new Date(`${lastNight.date}T00:00:00`).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })
    : "";
  const titles = { today: todayTitle, trends: "Trends", stats: "Stats", night: "Night detail", insights: "Insights", equipment: "Equipment" };

  if (splashStage !== "gone") {
    return <SplashScreen fadingOut={splashStage === "fading"} />;
  }
  if (showReport) {
    return <ClinicianReportScreen nights={nights} onBack={() => setShowReport(false)} equipment={equipment} />;
  }
  if (showImport) {
    return <ImportScreen onBack={() => setShowImport(false)} />;
  }
  if (showSettings) {
    return <SettingsScreen onBack={() => setShowSettings(false)} targets={targets} onChange={setTargets} />;
  }

  return (
    <div style={{ minHeight: "100vh", width: "100%", paddingBottom: 96, background: T.bg, fontFamily: "'Plus Jakarta Sans', ui-sans-serif, system-ui", color: T.ink }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');
        .font-display { font-family: 'Plus Jakarta Sans', ui-sans-serif, system-ui; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
      `}</style>

      <header style={{ maxWidth: 448, margin: "0 auto", padding: "20px 18px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => setShowSettings(true)} style={{ width: 36, height: 36, borderRadius: "50%", background: T.surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Settings size={17} style={{ color: T.ink }} />
        </button>
        <div className="font-display" style={{ fontSize: 22, fontWeight: 800, color: T.ink, letterSpacing: "-0.01em" }}>{titles[tab]}</div>
        <button onClick={() => setShowImport(true)} style={{ width: 36, height: 36, borderRadius: "50%", background: T.surface, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Upload size={17} style={{ color: T.ink }} />
        </button>
      </header>

      <main style={{ maxWidth: 448, margin: "0 auto", padding: "12px 18px 0" }}>
        {tab === "today" && <TodayScreen nights={nights} onNavigate={setTab} onSelectNight={goToNight} targets={targets} equipment={equipment} untaggedDates={untaggedDates} onOpenTagEntry={setTagEntryDate} />}
        {tab === "trends" && <TrendsScreen nights={nights} onSelectNight={goToNight} targets={targets} />}
        {tab === "stats" && <StatsScreen nights={nights} targets={targets} />}
        {tab === "night" && <DrillDownScreen nights={nights} idx={nightIdx} setIdx={setNightIdx} targets={targets} onOpenTagEntry={setTagEntryDate} />}
        {tab === "insights" && <InsightsScreen nights={nights} onOpenReport={() => setShowReport(true)} onNavigate={setTab} onSelectNight={goToNight} targets={targets} equipment={equipment} />}
        {tab === "equipment" && <EquipmentScreen equipment={equipment} onChange={setEquipment} />}
      </main>

      {tagEntryDate && (
        <TagEntryScreen date={tagEntryDate} initialEntry={tagLog[tagEntryDate]} onSave={saveTagEntry} onClose={() => setTagEntryDate(null)} />
      )}

      <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, display: "flex", justifyContent: "center", background: T.surface, borderTop: `1px solid ${T.line}` }}>
        <div style={{ maxWidth: 448, width: "100%", display: "flex", padding: "8px 4px" }}>
          {tabs.map((tb) => {
            const Icon = tb.icon; const active = tab === tb.key;
            return (
              <button key={tb.key} onClick={() => setTab(tb.key)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "6px 0" }}>
                <Icon size={18} style={{ color: active ? C.blue : T.muted }} />
                <span className="font-display" style={{ fontSize: 10, fontWeight: 500, color: active ? C.blue : T.muted }}>{tb.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
