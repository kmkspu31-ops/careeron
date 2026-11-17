import type { Certificate, Company, Job, Occupation } from "@/types";

export const occupations: Occupation[] = [
  { id: "product-designer", title: "프로덕트 디자이너", category: "디자인", summary: "사용자 문제를 발견하고 디지털 제품의 경험을 설계해요.", salary: "3,800만원", outlook: "매우 좋음", icon: "✳" },
  { id: "data-analyst", title: "데이터 분석가", category: "IT·데이터", summary: "데이터에서 의미 있는 인사이트와 비즈니스 기회를 찾아요.", salary: "4,200만원", outlook: "좋음", icon: "⌁" },
  { id: "product-manager", title: "서비스 기획자", category: "기획·마케팅", summary: "팀과 함께 서비스의 방향과 사용자 가치를 구체화해요.", salary: "4,000만원", outlook: "좋음", icon: "◈" },
  { id: "software-engineer", title: "소프트웨어 개발자", category: "IT·데이터", summary: "코드로 사람들이 사용하는 제품과 서비스를 만들어요.", salary: "4,500만원", outlook: "매우 좋음", icon: "</>" },
  { id: "brand-marketer", title: "브랜드 마케터", category: "기획·마케팅", summary: "브랜드의 이야기를 고객에게 매력적으로 전달해요.", salary: "3,600만원", outlook: "보통", icon: "◎" },
  { id: "career-counselor", title: "진로 상담사", category: "교육·복지", summary: "사람들이 자신의 강점과 다음 커리어를 찾도록 도와요.", salary: "3,400만원", outlook: "좋음", icon: "♡" },
];

export const jobs: Job[] = [
  { id: "sample-01", title: "주니어 프로덕트 디자이너", company: "온보딩랩", location: "서울 강남구", employmentType: "정규직", deadline: "11.30", tags: ["신입", "포트폴리오"] },
  { id: "sample-02", title: "데이터 분석 인턴", company: "데이터웨이브", location: "서울 성동구", employmentType: "인턴", deadline: "12.05", tags: ["인턴", "전환형"] },
  { id: "sample-03", title: "서비스 운영 매니저", company: "플로우웍스", location: "경기 성남시", employmentType: "정규직", deadline: "12.12", tags: ["신입", "고졸 가능"] },
  { id: "sample-04", title: "프론트엔드 개발자", company: "모먼트", location: "서울 마포구", employmentType: "정규직", deadline: "12.18", tags: ["신입", "React"] },
];

export const companies: Company[] = [
  { id: "onboarding-lab", name: "온보딩랩", industry: "IT·플랫폼", location: "서울 강남구", description: "누구나 더 나은 시작을 할 수 있도록 돕는 HR 테크 스타트업", size: "50-100명" },
  { id: "datawave", name: "데이터웨이브", industry: "데이터·AI", location: "서울 성동구", description: "데이터로 비즈니스의 다음 가능성을 발견합니다.", size: "100-300명" },
  { id: "flowworks", name: "플로우웍스", industry: "교육·서비스", location: "경기 성남시", description: "일과 배움이 자연스럽게 이어지는 세상을 만듭니다.", size: "30-50명" },
];

export const certificates: Certificate[] = [
  { id: "engineer-information-processing", name: "정보처리기사", category: "국가기술자격", issuer: "한국산업인력공단", nextDate: "2026.11.22", difficulty: "중" },
  { id: "computer-specialist", name: "컴퓨터활용능력 1급", category: "국가기술자격", issuer: "대한상공회의소", nextDate: "상시 시험", difficulty: "중" },
  { id: "korean-history", name: "한국사능력검정시험", category: "국가전문자격", issuer: "국사편찬위원회", nextDate: "2026.12.06", difficulty: "중" },
  { id: "adsp", name: "데이터분석 준전문가(ADsP)", category: "민간자격", issuer: "한국데이터산업진흥원", nextDate: "2026.12.14", difficulty: "중" },
];

export const categories = ["전체", "IT·데이터", "기획·마케팅", "디자인", "경영·사무", "교육·복지", "영업·서비스"];
