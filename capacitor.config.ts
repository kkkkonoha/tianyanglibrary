import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tianyang.library',
  appName: '天央图书馆',
  webDir: 'out',
  // 壳 App 远端加载现有网站（无需 HTTPS：壳内放行明文流量）
  server: {
    url: 'http://whitecraft.cn:10032',
    cleartext: true,
    androidScheme: 'http',
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
