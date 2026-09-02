import { defineConfig } from 'vite';
import path from 'path';

// 빌드 타깃 분기
//   npm run build      → 웹(Vercel) 빌드. 네이티브 전용 플러그인을 빈 shim으로 대체한다.
//   npm run build:app  → 안드로이드 앱 빌드(mode=native). 실제 Capacitor 플러그인을 번들한다.
//
// 주의: 과거 이 alias가 모든 빌드에 무조건 적용돼, 앱에도 빈 shim이 들어가면서
//       Firebase Analytics 커스텀 이벤트가 하나도 전송되지 않았다.
//       ("[Analytics] 초기화 완료" 로그는 정상 출력돼 정상처럼 보였음)
//       앱 빌드는 반드시 build:app 을 사용할 것. (npm run sync 가 이를 강제한다)
export default defineConfig(({ mode }) => {
  const isNative = mode === 'native';

  return {
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
    resolve: {
      alias: isNative
        ? {
            // 앱 빌드: 실제 플러그인을 쓰되, 플러그인의 '웹 구현'이 참조하는
            // 미설치 peer dep(firebase/analytics)만 스텁으로 해석시킨다.
            // 네이티브에서는 Capacitor 브리지가 쓰이므로 이 경로는 실행되지 않는다.
            'firebase/analytics': path.resolve(__dirname, 'src/shims/firebase-analytics-web.js'),
          }
        : {
            // 웹 빌드: 네이티브 전용 플러그인 전체를 빈 shim 으로 대체 (firebase JS SDK 미번들)
            '@capacitor-firebase/analytics': path.resolve(__dirname, 'src/shims/firebase-analytics.js'),
          },
    },
  };
});
