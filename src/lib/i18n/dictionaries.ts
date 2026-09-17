import type { Locale } from './config';

export type Dictionary = {
  brand: {
    title: string;
    tagline: string;
    description: string;
    aboutShort: string;
  };
  navigation: {
    home: string;
    about: string;
    devices: string;
    projects: string;
  };
  devices: {
    devEnvAria: string;
    homeLabAria: string;
  };
  language: {
    english: string;
    traditionalChinese: string;
    switchTo: (language: string) => string;
    fallback: (language: string) => string;
  };
  common: {
    allPosts: string;
    allTags: string;
    latestPosts: string;
    allPostsDescription: string;
    loading: string;
    backHome: string;
    sort: string;
    newest: string;
    oldest: string;
    searchPosts: string;
    searchPlaceholder: string;
    pageStatus: (current: number, total: number, count: number) => string;
    searchStatus: (term: string) => string;
    clearSearch: string;
    noMatchingPosts: string;
    previousPage: string;
    nextPage: string;
    sidebar: string;
    openSidebar: string;
    closeSidebar: string;
    tableOfContents: string;
    openTableOfContents: string;
    closeTableOfContents: string;
    showTableOfContents: string;
    hideTableOfContents: string;
    backToTop: string;
    articleNavigation: string;
    previousPost: string;
    nextPost: string;
    olderPost: string;
    newerPost: string;
    firstPost: string;
    latestPost: string;
    youAreHere: string;
    relatedPosts: string;
    relatedPostsDescription: string;
    footerCue: string;
    switchToLight: string;
    switchToDark: string;
    openMenu: string;
    closeMenu: string;
    navigationMenu: string;
  };
  search: {
    titleMatches: string;
    tagsMatches: string;
    navigation: string;
    recentPosts: string;
    searchResults: string;
    searching: string;
    noResults: string;
    close: string;
    open: string;
    dialogLabel: string;
    inputPlaceholder: string;
    home: string;
    blog: string;
    tags: string;
  };
  sidebar: {
    aboutAuthor: string;
    popularTags: string;
  };
  terminal: {
    ariaLabel: (title: string, tagline: string) => string;
  };
  tags: {
    title: string;
    description: string;
    explore: (count: number) => string;
    topTags: string;
    count: (count: number) => string;
    rank: (rank: number) => string;
  };
  projects: {
    title: string;
    description: string;
    count: (count: number) => string;
    empty: string;
  };
  errors: {
    notFoundTitle: string;
    notFoundDescription: string;
    errorTitle: string;
    errorDescription: string;
    retry: string;
    errorCode: string;
  };
  comments: {
    setup: (keys: string) => string;
    title: string;
  };
  mastodon: {
    noStatus: string;
    boosted: string;
    title: string;
    more: string;
    audio: string;
  };
  repo: {
    otherLanguage: string;
    updatedAt: string;
    unknown: string;
  };
  mermaid: {
    zoomOut: string;
    reset: string;
    zoomIn: string;
    fit: string;
    fullscreen: string;
  };
};

const dictionaries: Record<Locale, Dictionary> = {
  'zh-TW': {
    brand: {
      title: '霍德爾之目',
      tagline: '醫學、科技與生活的隨筆記錄。',
      description: '一個記錄醫學、科技與生活的個人部落格。',
      aboutShort: '醫師／寫作／技術分享',
    },
    navigation: {
      home: '首頁',
      about: '關於',
      devices: '裝置',
      projects: '作品',
    },
    language: {
      english: '英文',
      traditionalChinese: '繁中',
      switchTo: (language) => `切換至${language}`,
      fallback: (language) => `沒有對應翻譯，前往${language}區段首頁`,
    },
    devices: {
      devEnvAria: 'Mac mini、鍵盤與外接螢幕的 3D 裝置展示',
      homeLabAria: 'HomeLab 設備：Proxmox VE、VyOS、交換器、NAS (TrueNAS)',
    },
    common: {
      allPosts: '所有文章',
      allTags: '所有標籤',
      latestPosts: '最新文章',
      allPostsDescription: '瀏覽所有文章，持續更新中。',
      loading: '載入中...',
      backHome: '返回首頁',
      sort: '排序',
      newest: '最新',
      oldest: '最舊',
      searchPosts: '搜尋文章',
      searchPlaceholder: '搜尋文章…',
      pageStatus: (current, total, count) => `第 ${current} / ${total} 頁 · 共 ${count} 篇`,
      searchStatus: (term) => `（搜尋「${term}」）`,
      clearSearch: '清除搜尋',
      noMatchingPosts: '無符合條件的文章',
      previousPage: '上一頁',
      nextPage: '下一頁',
      sidebar: '側邊欄',
      openSidebar: '開啟側邊欄',
      closeSidebar: '關閉側邊欄',
      tableOfContents: '目錄',
      openTableOfContents: '開啟文章目錄',
      closeTableOfContents: '關閉文章目錄',
      showTableOfContents: '顯示目錄',
      hideTableOfContents: '隱藏目錄',
      backToTop: '回到頁面頂部',
      articleNavigation: '文章導覽',
      previousPost: '上一篇',
      nextPost: '下一篇',
      olderPost: '較舊文章',
      newerPost: '較新文章',
      firstPost: '已是首篇',
      latestPost: '已是最新',
      youAreHere: '你在這裡',
      relatedPosts: '相關文章',
      relatedPostsDescription: '為你挑選相似主題',
      footerCue: '即將展開',
      switchToLight: '切換為淺色主題',
      switchToDark: '切換為深色主題',
      openMenu: '開啟選單',
      closeMenu: '關閉選單',
      navigationMenu: '導覽選單',
    },
    search: {
      titleMatches: '標題相符',
      tagsMatches: '標籤相符',
      navigation: '導航',
      recentPosts: '最近文章',
      searchResults: '搜尋結果',
      searching: '搜尋中…',
      noResults: '找不到結果',
      close: 'ESC 關閉',
      open: '⌘K 開啟',
      dialogLabel: '全站搜尋',
      inputPlaceholder: '搜尋文章或快速導航…',
      home: '首頁',
      blog: '部落格',
      tags: '標籤',
    },
    sidebar: { aboutAuthor: '關於作者', popularTags: '熱門標籤' },
    terminal: { ariaLabel: (title, tagline) => `終端機：${title} - ${tagline}` },
    tags: {
      title: '標籤索引',
      description: '瀏覽所有標籤，探索不同主題的文章。',
      explore: (count) => `共 ${count} 組主題，任你探索`,
      topTags: '熱度最高的標籤：',
      count: (count) => `${count} 篇`,
      rank: (rank) => `熱度 #${rank}`,
    },
    projects: {
      title: 'GitHub 專案',
      description: '從我的 GitHub 帳號自動抓取公開的程式庫與專案。',
      count: (count) => `共 ${count} 個專案`,
      empty: '目前沒有可顯示的 GitHub 專案，或暫時無法連線到 GitHub。',
    },
    errors: {
      notFoundTitle: '找不到頁面',
      notFoundDescription: '您造訪的連結可能已失效或不存在。',
      errorTitle: '發生錯誤',
      errorDescription: '頁面載入時發生問題，請稍後再試。',
      retry: '重試',
      errorCode: '錯誤代碼',
    },
    comments: {
      setup: (keys) => `Giscus 尚未完成設定。請在 .env.local 補齊：${keys}`,
      title: '留言討論',
    },
    mastodon: {
      noStatus: '暫無動態',
      boosted: '轉推了',
      title: '微網誌',
      more: '查看更多',
      audio: '音訊',
    },
    repo: { otherLanguage: '其他', updatedAt: '更新於', unknown: '未知' },
    mermaid: { zoomOut: '縮小', reset: '重置', zoomIn: '放大', fit: '適合畫面', fullscreen: '全螢幕' },
  },
  en: {
    brand: {
      title: 'The Eye of Höðr',
      tagline: 'Notes on medicine, technology, and everyday life.',
      description: 'A personal blog about medicine, technology, and everyday life.',
      aboutShort: 'Physician / Writing / Technology',
    },
    navigation: {
      home: 'Home',
      about: 'About',
      devices: 'Devices',
      projects: 'Projects',
    },
    language: {
      english: 'English',
      traditionalChinese: 'Traditional Chinese',
      switchTo: (language) => `Switch to ${language}`,
      fallback: (language) => `No translated page; open the ${language} section index`,
    },
    devices: {
      devEnvAria: '3D showcase of a Mac mini, keyboard, and external display',
      homeLabAria: 'Home lab equipment: Proxmox VE, VyOS, switch, and NAS (TrueNAS)',
    },
    common: {
      allPosts: 'All posts',
      allTags: 'All tags',
      latestPosts: 'Latest posts',
      allPostsDescription: 'Browse all posts, with new entries added regularly.',
      loading: 'Loading...',
      backHome: 'Back home',
      sort: 'Sort',
      newest: 'Newest',
      oldest: 'Oldest',
      searchPosts: 'Search posts',
      searchPlaceholder: 'Search posts…',
      pageStatus: (current, total, count) => `Page ${current} of ${total} · ${count} posts`,
      searchStatus: (term) => `(search: “${term}”)`,
      clearSearch: 'Clear search',
      noMatchingPosts: 'No matching posts',
      previousPage: 'Previous',
      nextPage: 'Next',
      sidebar: 'Sidebar',
      openSidebar: 'Open sidebar',
      closeSidebar: 'Close sidebar',
      tableOfContents: 'Contents',
      openTableOfContents: 'Open table of contents',
      closeTableOfContents: 'Close table of contents',
      showTableOfContents: 'Show contents',
      hideTableOfContents: 'Hide contents',
      backToTop: 'Back to top',
      articleNavigation: 'Article navigation',
      previousPost: 'Previous post',
      nextPost: 'Next post',
      olderPost: 'Older post',
      newerPost: 'Newer post',
      firstPost: 'This is the first post',
      latestPost: 'This is the latest post',
      youAreHere: 'You are here',
      relatedPosts: 'Related posts',
      relatedPostsDescription: 'Selected for a similar topic',
      footerCue: 'More below',
      switchToLight: 'Switch to light theme',
      switchToDark: 'Switch to dark theme',
      openMenu: 'Open menu',
      closeMenu: 'Close menu',
      navigationMenu: 'Navigation menu',
    },
    search: {
      titleMatches: 'Title match',
      tagsMatches: 'Tag match',
      navigation: 'Navigation',
      recentPosts: 'Recent posts',
      searchResults: 'Search results',
      searching: 'Searching…',
      noResults: 'No results found',
      close: 'ESC to close',
      open: '⌘K to open',
      dialogLabel: 'Site search',
      inputPlaceholder: 'Search posts or navigate quickly…',
      home: 'Home',
      blog: 'Blog',
      tags: 'Tags',
    },
    sidebar: { aboutAuthor: 'About the author', popularTags: 'Popular tags' },
    terminal: { ariaLabel: (title, tagline) => `Terminal: ${title} — ${tagline}` },
    tags: {
      title: 'Tag index',
      description: 'Browse all tags and explore articles by topic.',
      explore: (count) => `${count} topics to explore`,
      topTags: 'Trending tags:',
      count: (count) => `${count} posts`,
      rank: (rank) => `Ranked #${rank}`,
    },
    projects: {
      title: 'GitHub Projects',
      description: 'Public repositories and projects fetched from my GitHub account.',
      count: (count) => `${count} projects`,
      empty: 'No GitHub projects are available, or GitHub is temporarily unreachable.',
    },
    errors: {
      notFoundTitle: 'Page not found',
      notFoundDescription: 'The link you followed may be invalid or no longer exist.',
      errorTitle: 'Something went wrong',
      errorDescription: 'There was a problem loading this page. Please try again later.',
      retry: 'Try again',
      errorCode: 'Error code',
    },
    comments: {
      setup: (keys) => `Giscus is not configured. Add these keys to .env.local: ${keys}`,
      title: 'Discussion',
    },
    mastodon: {
      noStatus: 'No recent posts',
      boosted: 'boosted',
      title: 'Microblog',
      more: 'View more',
      audio: 'Audio',
    },
    repo: { otherLanguage: 'Other', updatedAt: 'Updated', unknown: 'Unknown' },
    mermaid: { zoomOut: 'Zoom out', reset: 'Reset', zoomIn: 'Zoom in', fit: 'Fit to screen', fullscreen: 'Fullscreen' },
  },
};

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
