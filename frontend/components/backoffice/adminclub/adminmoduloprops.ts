
import {Dispatch, SetStateAction} from "react";
import {Team} from "@/components/backoffice/types/team";
import {Coach} from "@/components/backoffice/types/coach";
import {Student} from "@/components/backoffice/types/student";

export type AdminModuloProps = {
  team: Team;
  setTeam: Dispatch<SetStateAction<Team>>;
  coaches: Coach[];
  setCoaches: Dispatch<SetStateAction<Coach[]>>;
  students: Student[];
  setStudents: Dispatch<SetStateAction<Student[]>>;
  onLogout: () => void;
};