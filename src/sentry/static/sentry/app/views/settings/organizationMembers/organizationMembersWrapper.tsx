import React from 'react';
import styled from '@emotion/styled';
import {RouteComponentProps} from 'react-router/lib/Router';

import {openInviteMembersModal} from 'sentry/actionCreators/modal';
import {Organization, Member} from 'sentry/types';
import {Panel} from 'sentry/components/panels';
import {t} from 'sentry/locale';
import {trackAnalyticsEvent} from 'sentry/utils/analytics';
import AsyncView from 'sentry/views/asyncView';
import Badge from 'sentry/components/badge';
import Button from 'sentry/components/button';
import {IconMail} from 'sentry/icons';
import ListLink from 'sentry/components/links/listLink';
import NavTabs from 'sentry/components/navTabs';
import routeTitleGen from 'sentry/utils/routeTitle';
import SettingsPageHeader from 'sentry/views/settings/components/settingsPageHeader';
import space from 'sentry/styles/space';
import withOrganization from 'sentry/utils/withOrganization';

type Props = {
  children?: any;
  organization: Organization;
} & RouteComponentProps<{orgId: string}, {}>;

type State = AsyncView['state'] & {
  inviteRequests: Member[];
};

class OrganizationMembersWrapper extends AsyncView<Props, State> {
  getEndpoints(): [string, string][] {
    const {orgId} = this.props.params;

    return [
      ['inviteRequests', `/organizations/${orgId}/invite-requests/`],
      ['requestList', `/organizations/${orgId}/access-requests/`],
    ];
  }

  getTitle() {
    const {orgId} = this.props.params;
    return routeTitleGen(t('Members'), orgId, false);
  }

  get onRequestsTab() {
    return location.pathname.includes('/requests/');
  }

  get hasWriteAccess() {
    const {organization} = this.props;
    if (!organization || !organization.access) {
      return false;
    }
    return organization.access.includes('member:write');
  }

  get showInviteRequests() {
    return this.hasWriteAccess;
  }

  get showNavTabs() {
    const {requestList} = this.state;

    // show the requests tab if there are pending team requests,
    // or if the user has access to approve or deny invite requests
    return (requestList && requestList.length > 0) || this.showInviteRequests;
  }

  get requestCount() {
    const {requestList, inviteRequests} = this.state;
    let count = requestList.length;

    // if the user can't see the invite requests panel,
    // exclude those requests from the total count
    if (this.showInviteRequests) {
      count += inviteRequests.length;
    }
    return count ? count.toString() : null;
  }

  removeAccessRequest = (id: string) =>
    this.setState(state => ({
      requestList: state.requestList.filter(request => request.id !== id),
    }));

  removeInviteRequest = (id: string) =>
    this.setState(state => ({
      inviteRequests: state.inviteRequests.filter(request => request.id !== id),
    }));

  updateInviteRequest = (id: string, data: Partial<Member>) =>
    this.setState(state => {
      const inviteRequests = [...state.inviteRequests];
      const inviteIndex = inviteRequests.findIndex(request => request.id === id);

      inviteRequests[inviteIndex] = {...inviteRequests[inviteIndex], ...data};

      return {inviteRequests};
    });

  renderBody() {
    const {
      children,
      organization,
      params: {orgId},
    } = this.props;
    const {requestList, inviteRequests} = this.state;

    return (
      <React.Fragment>
        <SettingsPageHeader title="Members" />

        <StyledPanel>
          <IconMail size="lg" />
          <TextContainer>
            <Heading>{t('Invite new members')}</Heading>
            <SubText>
              {t('Invite new members by email to join your organization')}
            </SubText>
          </TextContainer>
          <Button
            priority="primary"
            onClick={() => openInviteMembersModal({source: 'members_settings'})}
          >
            {t('Invite Members')}
          </Button>
        </StyledPanel>

        {this.showNavTabs && (
          <NavTabs underlined>
            <ListLink
              to={`/settings/${orgId}/members/`}
              isActive={() => !this.onRequestsTab}
              data-test-id="members-tab"
            >
              {t('Members')}
            </ListLink>
            <ListLink
              to={`/settings/${orgId}/members/requests/`}
              isActive={() => this.onRequestsTab}
              data-test-id="requests-tab"
              onClick={() => {
                this.showInviteRequests &&
                  trackAnalyticsEvent({
                    eventKey: 'invite_request.tab_clicked',
                    eventName: 'Invite Request Tab Clicked',
                    organization_id: organization.id,
                  });
              }}
            >
              {t('Requests')}
            </ListLink>
            {this.requestCount && <StyledBadge text={this.requestCount} />}
          </NavTabs>
        )}

        {children &&
          React.cloneElement(children, {
            requestList,
            inviteRequests,
            onRemoveInviteRequest: this.removeInviteRequest,
            onUpdateInviteRequest: this.updateInviteRequest,
            onRemoveAccessRequest: this.removeAccessRequest,
            showInviteRequests: this.showInviteRequests,
          })}
      </React.Fragment>
    );
  }
}

const StyledPanel = styled(Panel)`
  padding: 18px;
  margin-top: -14px;
  margin-bottom: 40px;
  display: grid;
  grid-template-columns: max-content auto max-content;
  grid-gap: ${space(3)};
  align-content: center;
`;

const TextContainer = styled('div')`
  display: inline-grid;
  grid-gap: ${space(1)};
`;

const Heading = styled('h1')`
  margin: 0;
  font-weight: 400;
  font-size: ${p => p.theme.fontSizeExtraLarge};
`;

const SubText = styled('p')`
  margin: 0;
  color: ${p => p.theme.gray3};
  font-size: 15px;
`;

const StyledBadge = styled(Badge)`
  margin-left: -12px;

  @media (max-width: ${p => p.theme.breakpoints[0]}) {
    margin-left: -6px;
  }
`;

export default withOrganization(OrganizationMembersWrapper);
