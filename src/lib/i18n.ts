export type Locale = 'en' | 'ja' | 'zh';

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_STORAGE_KEY = 'visual_pomodoro_locale';

export const localeOptions: Array<{
  value: Locale;
  label: string;
  flag: string;
}> = [
  {value: 'en', label: 'English', flag: '🇺🇸'},
  {value: 'ja', label: '日本語', flag: '🇯🇵'},
  {value: 'zh', label: '中文', flag: '🇨🇳'},
];

type MessageDictionary = {
  authGateLoading: string;
  quickStats: {
    title: string;
    timeRecordTitle: string;
    tomatoResultTitle: string;
    today: string;
    streak: string;
    total: string;
    scatterFullData: string;
    scatterTotalData: string;
    trayStored: string;
    storeScatterFull: string;
    showTray: string;
    hideTray: string;
    debugTitle: string;
    totalData: string;
    scatterDataShown: string;
    trayDataShown: string;
    seedTestTomatoes: string;
    clearTestTomatoes: string;
    resetAccumulatedTime: string;
    viewAllStoredTomatoes: string;
    storedTomatoesTitle: string;
    storedTomatoesTotalDuration: string;
    clearTomatoResults: string;
    clearTomatoResultsConfirm: string;
    close: string;
  };
  timerControls: {
    resetTitle: string;
    settingsTitle: string;
    clockSound: string;
    screenOn: string;
    keepScreenOnTitle: string;
    wakeLockUnsupportedTitle: string;
    music: string;
    toggleMusicTitle: string;
    musicPremiumTitle: string;
    timerFinished: string;
  };
  settingsModal: {
    title: string;
    timerDuration: string;
    custom: string;
    customDurationPremiumHint: string;
    customDurationPlaceholder: string;
    customDurationApply: string;
    customDurationHint: string;
    customDurationError: string;
    backgroundImage: string;
    uploadImage: string;
    uploadDynamicBackground: string;
    dynamicBackgroundHint: string;
    videoBackgroundUnsupported: string;
    videoBackgroundSelectedWhenPaused: string;
    videoBackgroundDecodeUnsupported: string;
    videoBackgroundPlayFailed: string;
    clear: string;
    premium: string;
    customBackgroundsHint: string;
    soundModes: string;
    tickStyle: string;
    alarmStyle: string;
    tickClassic: string;
    tickWood: string;
    tickDigital: string;
    alarmClassic: string;
    alarmPulse: string;
    alarmChime: string;
    backgroundMusic: string;
    uploadMusicFile: string;
    backgroundMusicHint: string;
    upgrade: string;
    upgradeDescription: string;
    unlockFullVersion: string;
    accessAndLicense: string;
    shareApp: string;
    linkCopied: string;
    done: string;
    languageMenuTitle: string;
  };
  lockScreen: {
    lockedTitle: string;
    storedLicenseInvalid: string;
    trialBootstrapNeeded: string;
    noValidAccess: string;
  };
  authPanel: {
    freeMode: string;
    currentAccess: string;
    accessStatus: string;
    premiumAccessHelp: string;
    freeAccessHelp: string;
    deviceId: string;
    trial: string;
    license: string;
    activeUntilPrefix: string;
    trialEnded: string;
    notStarted: string;
    valid: string;
    expired: string;
    invalid: string;
    notInstalled: string;
    step1Title: string;
    step1Description: string;
    commercialLicenseKey: string;
    commercialLicenseKeyPlaceholder: string;
    activateLicenseKey: string;
    activationConfirmsStatus: string;
    licenseSavedSuccess: string;
    tokenPreparedManual: string;
    step2Title: string;
    step2Description: string;
    licenseToken: string;
    licenseTokenPlaceholder: string;
    saveLicense: string;
    refresh: string;
    clearLicense: string;
  };
};

export const messages: Record<Locale, MessageDictionary> = {
  en: {
    authGateLoading: 'Loading access',
    quickStats: {
      title: 'Focus Log',
      timeRecordTitle: 'Time Progress',
      tomatoResultTitle: 'Tomato Results',
      today: 'Today Focus',
      streak: 'Streak Days',
      total: 'Total Focus Time',
      scatterFullData: 'Completed Tomato Rounds',
      scatterTotalData: 'Fragment Tomato Count',
      trayStored: 'Stored Tomatoes',
      storeScatterFull: 'Store Completed Tomatoes',
      showTray: 'Show Tomato Tray',
      hideTray: 'Hide Tomato Tray',
      debugTitle: 'Debug',
      totalData: 'Total (data)',
      scatterDataShown: 'Scatter data / shown',
      trayDataShown: 'Tray data / shown',
      seedTestTomatoes: 'Seed 20 Test Tomatoes',
      clearTestTomatoes: 'Clear Test Tomatoes',
      resetAccumulatedTime: 'Reset Focus Totals',
      viewAllStoredTomatoes: 'View All Stored Tomatoes',
      storedTomatoesTitle: 'Stored Tomatoes',
      storedTomatoesTotalDuration: 'Stored Focus Duration',
      clearTomatoResults: 'Clear Tomato Results',
      clearTomatoResultsConfirm: 'Tap Again to Clear',
      close: 'Close',
    },
    timerControls: {
      resetTitle: 'Reset',
      settingsTitle: 'Settings',
      clockSound: 'Clock Sound',
      screenOn: 'Screen On',
      keepScreenOnTitle: 'Keep screen on',
      wakeLockUnsupportedTitle: 'Screen Wake Lock is not supported',
      music: 'Music',
      toggleMusicTitle: 'Toggle background music',
      musicPremiumTitle: 'Background music requires premium',
      timerFinished: 'That was time well kept',
    },
    settingsModal: {
      title: 'Customization',
      timerDuration: 'Timer Duration (Minutes)',
      custom: 'Custom',
      customDurationPremiumHint: 'Premium unlocks longer sessions and custom duration.',
      customDurationPlaceholder: 'Enter 1–240 minutes',
      customDurationApply: 'Apply',
      customDurationHint: 'Press Enter or Apply',
      customDurationError: 'Enter a whole number from 1 to 240.',
      backgroundImage: 'Background Image',
      uploadImage: 'Upload Image',
      uploadDynamicBackground: 'Upload Dynamic Background',
      dynamicBackgroundHint: 'Supports MP4, WebM, and MOV up to 25MB.',
      videoBackgroundUnsupported: 'Upload failed. Please try again.',
      videoBackgroundSelectedWhenPaused: 'Video uploaded. Press play to view it.',
      videoBackgroundDecodeUnsupported: 'Upload failed. Please try again.',
      videoBackgroundPlayFailed: 'Upload failed. Please try again.',
      clear: 'Clear',
      premium: 'Premium',
      customBackgroundsHint: 'Premium unlocks custom backgrounds',
      soundModes: 'Sound Modes',
      tickStyle: 'Tick Style',
      alarmStyle: 'Alarm Style',
      tickClassic: 'Classic',
      tickWood: 'Wood',
      tickDigital: 'Digital',
      alarmClassic: 'Classic',
      alarmPulse: 'Pulse',
      alarmChime: 'Chime',
      backgroundMusic: 'Background Music',
      uploadMusicFile: 'Upload Music File',
      backgroundMusicHint: 'Premium unlocks background music upload',
      upgrade: 'Upgrade',
      upgradeDescription: 'Unlock longer sessions, custom duration, music, and custom backgrounds.',
      unlockFullVersion: 'Unlock Full Version',
      accessAndLicense: 'Access & License',
      shareApp: 'Share App',
      linkCopied: 'Link Copied',
      done: 'Done',
      languageMenuTitle: 'Language',
    },
    lockScreen: {
      lockedTitle: 'Locked',
      storedLicenseInvalid:
        'The stored formal license is invalid or expired for this device. Trial access is not available, so the app remains locked.',
      trialBootstrapNeeded:
        'No formal license is installed, and trial access still needs a successful server bootstrap before the app can unlock.',
      noValidAccess: 'No valid formal license or active signed offline trial is available for this device.',
    },
    authPanel: {
      freeMode: 'FREE MODE',
      currentAccess: 'Current Access',
      accessStatus: 'Access Status',
      premiumAccessHelp: 'Activation confirms license status. Your formal token still unlocks this device.',
      freeAccessHelp: 'Free mode stays available. Upgrade to unlock longer sessions, custom duration, music, and custom backgrounds.',
      deviceId: 'Device ID',
      trial: 'Trial',
      license: 'License',
      activeUntilPrefix: 'Active until',
      trialEnded: 'Trial ended',
      notStarted: 'Not started',
      valid: 'Valid',
      expired: 'Expired',
      invalid: 'Invalid',
      notInstalled: 'Not installed',
      step1Title: 'Step 1: Validate purchase',
      step1Description: 'Enter your commercial license key. If valid, this device will be unlocked automatically.',
      commercialLicenseKey: 'Commercial License Key',
      commercialLicenseKeyPlaceholder: 'Enter your commercial license key',
      activateLicenseKey: 'Activate License Key',
      activationConfirmsStatus: 'Activation confirms license status. Your formal token still unlocks this device.',
      licenseSavedSuccess: 'License saved. This device is now unlocked.',
      tokenPreparedManual: 'Token prepared for this device. Continue with Step 2 manually.',
      step2Title: 'Step 2: Paste formal token to unlock',
      step2Description: 'Manual fallback: paste a formal token for this device only if automatic unlock does not complete.',
      licenseToken: 'License Token',
      licenseTokenPlaceholder: 'Paste your Visual Pomodoro license token',
      saveLicense: 'Save License',
      refresh: 'Refresh',
      clearLicense: 'Clear License',
    },
  },
  ja: {
    authGateLoading: 'アクセスを読み込み中',
    quickStats: {
      title: '集中記録',
      timeRecordTitle: '時間の積み上げ',
      tomatoResultTitle: 'トマトの成果',
      today: '今日の集中',
      streak: '連続日数',
      total: '累計時間',
      scatterFullData: '完了トマト数',
      scatterTotalData: '欠けトマト数',
      trayStored: '収納済みトマト',
      storeScatterFull: '完了トマトをまとめて収納',
      showTray: 'トレーを表示',
      hideTray: 'トレーを隠す',
      debugTitle: 'デバッグ',
      totalData: '合計（データ）',
      scatterDataShown: '散落 データ / 表示',
      trayDataShown: 'トレイ データ / 表示',
      seedTestTomatoes: 'テスト番茄 20 件を投入',
      clearTestTomatoes: 'テスト番茄をクリア',
      resetAccumulatedTime: '累計時間をリセット',
      viewAllStoredTomatoes: '収納済みトマトをすべて表示',
      storedTomatoesTitle: '収納済みトマト',
      storedTomatoesTotalDuration: '収納成果の合計時間',
      clearTomatoResults: 'トマト成果をクリア',
      clearTomatoResultsConfirm: 'もう一度押して確定',
      close: '閉じる',
    },
    timerControls: {
      resetTitle: 'リセット',
      settingsTitle: '設定',
      clockSound: '時計音',
      screenOn: '画面オン',
      keepScreenOnTitle: '画面を点灯したままにする',
      wakeLockUnsupportedTitle: 'この端末では画面点灯維持に対応していません',
      music: '音楽',
      toggleMusicTitle: 'BGM を切り替える',
      musicPremiumTitle: 'BGM はプレミアム機能です',
      timerFinished: 'よく集中できました',
    },
    settingsModal: {
      title: 'カスタマイズ',
      timerDuration: 'タイマー時間（分）',
      custom: 'カスタム',
      customDurationPremiumHint: 'プレミアムで長時間セッションとカスタム時間が使えます。',
      customDurationPlaceholder: '1〜240 分を入力',
      customDurationApply: '適用',
      customDurationHint: 'Enter キーまたは適用を押してください',
      customDurationError: '1〜240 の整数を入力してください。',
      backgroundImage: '背景画像',
      uploadImage: '画像をアップロード',
      uploadDynamicBackground: '動画背景をアップロード',
      dynamicBackgroundHint: 'MP4 / WebM / MOV（最大25MB）に対応しています。',
      videoBackgroundUnsupported: 'アップロードに失敗しました。もう一度お試しください。',
      videoBackgroundSelectedWhenPaused: '動画をアップロードしました。再生ボタンを押すと表示されます。',
      videoBackgroundDecodeUnsupported: 'アップロードに失敗しました。もう一度お試しください。',
      videoBackgroundPlayFailed: 'アップロードに失敗しました。もう一度お試しください。',
      clear: 'クリア',
      premium: 'プレミアム',
      customBackgroundsHint: 'プレミアムでカスタム背景が使えます',
      soundModes: 'サウンド',
      tickStyle: 'チック音',
      alarmStyle: 'アラーム音',
      tickClassic: 'クラシック',
      tickWood: 'ウッド',
      tickDigital: 'デジタル',
      alarmClassic: 'クラシック',
      alarmPulse: 'パルス',
      alarmChime: 'チャイム',
      backgroundMusic: 'BGM',
      uploadMusicFile: '音楽ファイルをアップロード',
      backgroundMusicHint: 'プレミアムで BGM アップロードが使えます',
      upgrade: 'アップグレード',
      upgradeDescription: '長時間セッション、カスタム時間、音楽、カスタム背景を解除します。',
      unlockFullVersion: 'フル版を解除',
      accessAndLicense: 'アクセスとライセンス',
      shareApp: 'アプリを共有',
      linkCopied: 'リンクをコピーしました',
      done: '完了',
      languageMenuTitle: '言語',
    },
    lockScreen: {
      lockedTitle: 'ロック中',
      storedLicenseInvalid:
        '保存済みの正式ライセンスはこの端末では無効、または期限切れです。試用アクセスも利用できないため、アプリはロックされたままです。',
      trialBootstrapNeeded:
        '正式ライセンスは未設定で、試用アクセスの利用にはサーバーでの初期化成功がまだ必要です。',
      noValidAccess: 'この端末では有効な正式ライセンスも、有効な署名付きオフライントライアルも利用できません。',
    },
    authPanel: {
      freeMode: '無料モード',
      currentAccess: '現在のアクセス',
      accessStatus: 'アクセス状態',
      premiumAccessHelp: 'アクティベーションによりライセンス状態が確認されます。正式トークンは引き続きこの端末を解除します。',
      freeAccessHelp: '無料モードは引き続き利用できます。長時間セッション、カスタム時間、音楽、カスタム背景を使うにはアップグレードしてください。',
      deviceId: 'デバイス ID',
      trial: '試用',
      license: 'ライセンス',
      activeUntilPrefix: '有効期限',
      trialEnded: '試用終了',
      notStarted: '未開始',
      valid: '有効',
      expired: '期限切れ',
      invalid: '無効',
      notInstalled: '未設定',
      step1Title: 'ステップ 1: 購入内容を確認',
      step1Description: '商用ライセンスキーを入力してください。有効な場合、この端末は自動で解除されます。',
      commercialLicenseKey: '商用ライセンスキー',
      commercialLicenseKeyPlaceholder: '商用ライセンスキーを入力',
      activateLicenseKey: 'ライセンスキーを有効化',
      activationConfirmsStatus: 'アクティベーションによりライセンス状態が確認されます。正式トークンは引き続きこの端末を解除します。',
      licenseSavedSuccess: 'ライセンスを保存しました。この端末は解除されました。',
      tokenPreparedManual: 'この端末用のトークンは準備されました。続けてステップ 2 を手動で行ってください。',
      step2Title: 'ステップ 2: 正式トークンを貼り付けて解除',
      step2Description: '自動解除が完了しない場合のみ、この端末用の正式トークンを手動で貼り付けてください。',
      licenseToken: 'ライセンストークン',
      licenseTokenPlaceholder: 'Visual Pomodoro のライセンストークンを貼り付け',
      saveLicense: 'ライセンスを保存',
      refresh: '再読み込み',
      clearLicense: 'ライセンスを消去',
    },
  },
  zh: {
    authGateLoading: '正在加载访问状态',
    quickStats: {
      title: '专注记录',
      timeRecordTitle: '时间积累',
      tomatoResultTitle: '番茄成果',
      today: '今日专注',
      streak: '连续天数',
      total: '累计时长',
      scatterFullData: '完整番茄轮',
      scatterTotalData: '碎片番茄数',
      trayStored: '已收纳番茄',
      storeScatterFull: '一键收纳番茄',
      showTray: '显示托盘',
      hideTray: '隐藏托盘',
      debugTitle: '调试',
      totalData: '总数（数据）',
      scatterDataShown: '散落 数据 / 显示',
      trayDataShown: '托盘 数据 / 显示',
      seedTestTomatoes: '注入 20 个测试番茄',
      clearTestTomatoes: '清除面板数据',
      resetAccumulatedTime: '重置累计时间',
      viewAllStoredTomatoes: '查看全部已收纳番茄',
      storedTomatoesTitle: '已收纳番茄',
      storedTomatoesTotalDuration: '已收纳成果总时长',
      clearTomatoResults: '清空番茄成果',
      clearTomatoResultsConfirm: '再次点击确认清空',
      close: '关闭',
    },
    timerControls: {
      resetTitle: '重置',
      settingsTitle: '设置',
      clockSound: '时钟音',
      screenOn: '屏幕常亮',
      keepScreenOnTitle: '保持屏幕常亮',
      wakeLockUnsupportedTitle: '当前设备不支持屏幕常亮锁',
      music: '音乐',
      toggleMusicTitle: '切换背景音乐',
      musicPremiumTitle: '背景音乐需要高级版',
      timerFinished: '这是一段被好好专注过的时间',
    },
    settingsModal: {
      title: '自定义',
      timerDuration: '计时长度（分钟）',
      custom: '自定义',
      customDurationPremiumHint: '高级版可解锁更长时段和自定义时长。',
      customDurationPlaceholder: '输入 1–240 分钟',
      customDurationApply: '应用',
      customDurationHint: '按 Enter 或点击应用',
      customDurationError: '请输入 1 到 240 的整数。',
      backgroundImage: '背景图片',
      uploadImage: '上传图片',
      uploadDynamicBackground: '上传动态背景',
      dynamicBackgroundHint: '支持 MP4 / WebM / MOV，最大 25MB。',
      videoBackgroundUnsupported: '上传失败，请重新上传。',
      videoBackgroundSelectedWhenPaused: '视频已上传，按播放键即可显示。',
      videoBackgroundDecodeUnsupported: '上传失败，请重新上传。',
      videoBackgroundPlayFailed: '上传失败，请重新上传。',
      clear: '清除',
      premium: '高级版',
      customBackgroundsHint: '高级版可解锁自定义背景',
      soundModes: '声音模式',
      tickStyle: '滴答音',
      alarmStyle: '提醒音',
      tickClassic: '经典',
      tickWood: '木质',
      tickDigital: '数字',
      alarmClassic: '经典',
      alarmPulse: '脉冲',
      alarmChime: '钟声',
      backgroundMusic: '背景音乐',
      uploadMusicFile: '上传音乐文件',
      backgroundMusicHint: '高级版可解锁背景音乐上传',
      upgrade: '升级',
      upgradeDescription: '解锁更长时段、自定义时长、音乐和自定义背景。',
      unlockFullVersion: '解锁完整版',
      accessAndLicense: '访问与授权',
      shareApp: '分享应用',
      linkCopied: '链接已复制',
      done: '完成',
      languageMenuTitle: '语言',
    },
    lockScreen: {
      lockedTitle: '已锁定',
      storedLicenseInvalid:
        '当前设备上保存的正式授权无效或已过期。由于试用权限也不可用，应用将继续保持锁定状态。',
      trialBootstrapNeeded:
        '当前尚未安装正式授权，试用权限仍需先成功完成一次服务器初始化后才能解锁应用。',
      noValidAccess: '当前设备没有可用的正式授权，也没有有效的离线签名试用权限。',
    },
    authPanel: {
      freeMode: '免费模式',
      currentAccess: '当前访问状态',
      accessStatus: '访问状态',
      premiumAccessHelp: '激活会确认授权状态，正式令牌仍会继续为这台设备解锁。',
      freeAccessHelp: '免费模式仍可继续使用。升级后可解锁更长时段、自定义时长、音乐和自定义背景。',
      deviceId: '设备 ID',
      trial: '试用',
      license: '授权',
      activeUntilPrefix: '有效至',
      trialEnded: '试用已结束',
      notStarted: '尚未开始',
      valid: '有效',
      expired: '已过期',
      invalid: '无效',
      notInstalled: '未安装',
      step1Title: '步骤 1：验证购买',
      step1Description: '输入你的商业授权密钥。如果有效，这台设备会自动解锁。',
      commercialLicenseKey: '商业授权密钥',
      commercialLicenseKeyPlaceholder: '输入你的商业授权密钥',
      activateLicenseKey: '激活授权密钥',
      activationConfirmsStatus: '激活会确认授权状态，正式令牌仍会继续为这台设备解锁。',
      licenseSavedSuccess: '授权已保存，这台设备现在已解锁。',
      tokenPreparedManual: '这台设备的令牌已准备好，请继续手动完成步骤 2。',
      step2Title: '步骤 2：粘贴正式令牌以解锁',
      step2Description: '只有在自动解锁未完成时，才需要手动粘贴这台设备专用的正式令牌。',
      licenseToken: '授权令牌',
      licenseTokenPlaceholder: '粘贴你的 Visual Pomodoro 授权令牌',
      saveLicense: '保存授权',
      refresh: '刷新',
      clearLicense: '清除授权',
    },
  },
};
