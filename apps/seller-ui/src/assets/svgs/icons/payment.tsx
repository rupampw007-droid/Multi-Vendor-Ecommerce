import React from "react";

interface PaymentProps extends React.SVGProps<SVGSVGElement> {
  fill?: string;
}

const Payment: React.FC<PaymentProps> = ({ fill = "#000000", width = 24, height = 24, ...props }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      {...props}
    >
      <rect x="3" y="6" width="18" height="13" rx="2" stroke={fill} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 10H20.5" stroke={fill} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 15H9" stroke={fill} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export default Payment;