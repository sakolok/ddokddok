// 실시간 동아일보/주요 언론사 건강 뉴스 RSS 라이브 서비스

const LIVE_HEALTH_RSS = 'https://rss.donga.com/health.xml';

// 오프라인 또는 네트워크 예외 시 직접 이동할 수 있는 검증된 실제 뉴스와 직링크
const VERIFIED_REAL_ARTICLES = [
  {
    id: 'v1',
    tag: '두뇌건강',
    color: '#1e3a8a',
    icon: 'bulb-outline',
    title: '중년기에 ‘세 가지’ 피하면 치매 발병위험 13년 늦출 수 있다',
    publisher: '동아일보 건강',
    date: '최신 뉴스',
    summary: '중년기 고혈압, 당뇨, 흡연 등 3가지 위험 요인을 적극 관리하면 노년기 치매 발병 시기를 최대 13년 이상 뒤로 연장시킬 수 있다는 신경과 임상 연구 결과입니다.',
    url: 'https://www.donga.com/news/It/article/all/20260807/134429823/2',
  },
  {
    id: 'v2',
    tag: '생활습관',
    color: '#047857',
    icon: 'sunny-outline',
    title: '폭염 속 탈수 경고등… “소금보다 물 한 잔이 생명 지킴이”',
    publisher: '동아일보 건강',
    date: '최신 뉴스',
    summary: '여름철 시니어 온열 질환과 뇌혈관 건강을 지키는 가장 확실한 예방법은 정기적인 미지근한 물 섭취입니다.',
    url: 'https://www.donga.com/news/Society/article/all/20260809/134442847/1',
  },
  {
    id: 'v3',
    tag: '영양케어',
    color: '#d97706',
    icon: 'restaurant-outline',
    title: '단백질 많이 먹으라더니, 이제는 줄여야 더 건강? 진실은…',
    publisher: '동아일보 건강',
    date: '최신 뉴스',
    summary: '시니어 근손실 방지를 위한 적정 단백질 섭취량과 자극적이지 않은 식단 구성법을 체크해 보세요.',
    url: 'https://www.donga.com/news/It/article/all/20260807/134425591/2',
  },
  {
    id: 'v4',
    tag: '치매예방',
    color: '#0284c7',
    icon: 'medkit-outline',
    title: '“감기인줄 알았는데”…방치하면 패혈증 위험 ‘이 질환’ 주의',
    publisher: '동아일보 건강',
    date: '최신 뉴스',
    summary: '초기 증상이 감기와 유사하여 놓치기 쉬운 시니어 면역계 질환의 주요 신호와 빠른 대처법을 알아봅니다.',
    url: 'https://www.donga.com/news/Society/article/all/20260809/134442322/1',
  },
];

// 배열 무작위 셔플
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 실시간 언론사 건강 뉴스 RSS 가져오기 (직접 기사 URL)
 */
export async function fetchHealthNews() {
  try {
    const response = await fetch(LIVE_HEALTH_RSS);
    if (response.ok) {
      const xmlText = await response.text();
      const itemBlocks = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];

      const parsedNews = [];
      const TAG_CONFIGS = [
        { tag: '두뇌건강', color: '#1e3a8a', icon: 'bulb-outline' },
        { tag: '생활습관', color: '#047857', icon: 'sunny-outline' },
        { tag: '시니어케어', color: '#7c3aed', icon: 'heart-outline' },
        { tag: '치매예방', color: '#0284c7', icon: 'medkit-outline' },
        { tag: '영양케어', color: '#d97706', icon: 'restaurant-outline' },
      ];

      itemBlocks.forEach((item, idx) => {
        // CDATA 안의 제목 및 링크 추출
        const titleMatch = item.match(/<title>[\s\S]*?<!\[CDATA\[([\s\S]*?)\]\]>/) || item.match(/<title>([\s\S]*?)<\/title>/);
        const linkMatch  = item.match(/<link>[\s\S]*?<!\[CDATA\[([\s\S]*?)\]\]>/)  || item.match(/<link>([\s\S]*?)<\/link>/);
        const descMatch  = item.match(/<description>[\s\S]*?<!\[CDATA\[([\s\S]*?)\]\]>/) || item.match(/<description>([\s\S]*?)<\/description>/);

        let title = titleMatch ? titleMatch[1].trim() : '';
        let link  = linkMatch  ? linkMatch[1].trim()  : '';
        let desc  = descMatch  ? descMatch[1].replace(/<[^>]*>?/gm, '').trim() : '';

        const cfg = TAG_CONFIGS[idx % TAG_CONFIGS.length];

        if (title && link) {
          parsedNews.push({
            id: `live_${idx}_${Math.random()}`,
            tag: cfg.tag,
            color: cfg.color,
            icon: cfg.icon,
            title: title,
            publisher: '동아일보 건강',
            date: '실시간 뉴스',
            summary: desc || '터치하시면 해당 언론사의 실제 작성된 원본 기사 페이지로 바로 이동합니다.',
            url: link,
          });
        }
      });

      if (parsedNews.length >= 3) {
        return shuffleArray(parsedNews).slice(0, 3);
      }
    }
  } catch (err) {
    console.log('[newsService] Live RSS fetch error, fallback used:', err?.message);
  }

  return shuffleArray(VERIFIED_REAL_ARTICLES).slice(0, 3);
}
