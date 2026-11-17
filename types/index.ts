export type Occupation = {
  id: string;
  title: string;
  category: string;
  summary: string;
  salary: string;
  outlook: string;
  icon: string;
};

export type Job = {
  id: string;
  title: string;
  company: string;
  location: string;
  employmentType: string;
  deadline: string;
  tags: string[];
};

export type Company = {
  id: string;
  name: string;
  industry: string;
  location: string;
  description: string;
  size: string;
};

export type Certificate = {
  id: string;
  name: string;
  category: string;
  issuer: string;
  nextDate: string;
  difficulty: string;
};
