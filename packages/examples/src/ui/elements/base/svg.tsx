import React from 'react';

import { EventsContext } from '../renderer';

type SvgProps = ElementProps & {
  raw: string;
};

export const Svg: React.FC<SvgProps> = ({
  id,
  assetId,
  className,
  children,
}) => {
  const events = React.useContext(EventsContext);

  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: svg }} />
  );
};
