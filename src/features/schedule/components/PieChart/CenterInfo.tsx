import { CENTER } from "../../constants";

export const CenterInfo = () => {
  return (
    <>
      <circle
        cx={CENTER}
        cy={CENTER}
        r={40}
        fill="white"
        className="shadow-lg"
      />
      <text
        x={CENTER}
        y={CENTER - 8}
        textAnchor="middle"
        className="text-[10px] font-bold fill-gray-400 select-none tracking-widest export-target-total"
      >
        TOTAL
      </text>
      <text
        x={CENTER}
        y={CENTER + 12}
        textAnchor="middle"
        className="text-xl font-bold fill-gray-800 select-none export-target-24h"
      >
        24H
      </text>
    </>
  );
};