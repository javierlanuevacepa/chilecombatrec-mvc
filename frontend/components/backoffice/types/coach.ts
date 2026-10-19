export type Coach = {
  /** uuid del backend (`usuario.uuid`) */
  id: string;
  name: string;
  email: string;
  phone: string;
  /** uuids de disciplinas que entrena. 0..N */
  disciplinas: string[];
};