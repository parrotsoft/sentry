import React from 'react';
import styled from '@emotion/styled';

import {t} from 'sentry/locale';
import Banner from 'sentry/components/banner';
import Button from 'sentry/components/button';
import localStorage from 'sentry/utils/localStorage';
import space from 'sentry/styles/space';

import backgroundLighthouse from '../../../../images/spot/background-lighthouse.svg';

const BANNER_DISMISSED_KEY = 'releases-banner-dismissed';

type State = {
  isBannerHidden: boolean;
};

class IntroBanner extends React.Component<{}, State> {
  state = {
    isBannerHidden: localStorage.getItem(BANNER_DISMISSED_KEY) === 'true',
  };

  handleBannerCloseClick = () => {
    localStorage.setItem(BANNER_DISMISSED_KEY, 'true');
    this.setState({isBannerHidden: true});
  };

  render() {
    if (this.state.isBannerHidden) {
      return null;
    }

    return (
      <StyledBanner
        title={t('Spot Release Changes')}
        subtitle={t(
          'See differences between releases, from crash analytics to adoption rates.'
        )}
        backgroundImg={backgroundLighthouse}
        onCloseClick={this.handleBannerCloseClick}
      >
        <BannerButton href="https://docs.sentry.io/workflow/releases/health/" external>
          {t('View Features')}
        </BannerButton>
        <BannerButton
          href="https://docs.sentry.io/workflow/releases/health/#getting-started"
          external
          priority="primary"
        >
          {t('Update SDK')}
        </BannerButton>
      </StyledBanner>
    );
  }
}

const StyledBanner = styled(Banner)`
  color: ${p => p.theme.gray5};
`;

const BannerButton = styled(Button)`
  margin: ${space(1)};
`;

export default IntroBanner;
