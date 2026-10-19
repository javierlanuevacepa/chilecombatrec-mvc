import {
  type ReactNode

} from "react";

export default function Panel({ children, innerClassName = "" }: { children: ReactNode; innerClassName?: string }) {
  return (
    <div className="bg-[color:var(--line)] p-px [--cut:18px] [clip-path:polygon(var(--cut)_0,100%_0,100%_calc(100%_-_var(--cut)),calc(100%_-_var(--cut))_100%,0_100%,0_var(--cut))]">
      <div
        className={`bg-[color:var(--surface)] [--cut:17px] [clip-path:polygon(var(--cut)_0,100%_0,100%_calc(100%_-_var(--cut)),calc(100%_-_var(--cut))_100%,0_100%,0_var(--cut))] ${innerClassName}`}
      >
        {children}
      </div>
    </div>
  );
}