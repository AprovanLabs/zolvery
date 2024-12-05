import React from 'react';

export type ElementProps = {
  id: string;
  className: string;
  children: ElementProps[];
  assetId?: string;
};

export const Element: React.FC<ElementProps> = ({
  id,
  className,
  children,
}) => {
  return (
    <div id={id} className={className}>
      {children &&
        children.map((props) => <Element key={props.id} {...props} />)}
    </div>
  );
};
