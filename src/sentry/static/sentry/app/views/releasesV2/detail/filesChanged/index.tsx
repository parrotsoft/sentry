import React from 'react';
import {RouteComponentProps} from 'react-router/lib/Router';
import styled from '@emotion/styled';

import AsyncComponent from 'sentry/components/asyncComponent';
import RepositoryFileSummary from 'sentry/components/repositoryFileSummary';
import {t} from 'sentry/locale';
import space from 'sentry/styles/space';
import {CommitFile, Repository, Organization} from 'sentry/types';
import EmptyStateWarning from 'sentry/components/emptyStateWarning';
import AsyncView from 'sentry/views/asyncView';
import withOrganization from 'sentry/utils/withOrganization';
import routeTitleGen from 'sentry/utils/routeTitle';
import {formatVersion} from 'sentry/utils/formatters';
import {Panel, PanelBody} from 'sentry/components/panels';

import {getFilesByRepository} from '../utils';
import ReleaseNoCommitData from '../releaseNoCommitData';

type RouteParams = {
  orgId: string;
  release: string;
};

type Props = RouteComponentProps<RouteParams, {}> & {
  organization: Organization;
};

type State = {
  fileList: CommitFile[];
  repos: Repository[];
} & AsyncComponent['state'];

class FilesChanged extends AsyncView<Props, State> {
  getTitle() {
    const {params, organization} = this.props;
    return routeTitleGen(
      t('Files Changed - Release %s', formatVersion(params.release)),
      organization.slug,
      false
    );
  }

  getEndpoints(): ReturnType<AsyncComponent['getEndpoints']> {
    const {orgId, release} = this.props.params;

    return [
      [
        'fileList',
        `/organizations/${orgId}/releases/${encodeURIComponent(release)}/commitfiles/`,
      ],
      ['repos', `/organizations/${orgId}/repos/`],
    ];
  }

  renderBody() {
    const {orgId} = this.props.params;
    const {fileList, repos} = this.state;
    const filesByRepository = getFilesByRepository(fileList);

    if (repos.length === 0) {
      return <ReleaseNoCommitData orgId={orgId} />;
    }

    return (
      <ContentBox>
        {fileList.length ? (
          Object.keys(filesByRepository).map(repository => (
            <RepositoryFileSummary
              key={repository}
              repository={repository}
              fileChangeSummary={filesByRepository[repository]}
              collapsable={false}
            />
          ))
        ) : (
          <Panel>
            <PanelBody>
              <EmptyStateWarning small>
                {t('There are no changed files.')}
              </EmptyStateWarning>
            </PanelBody>
          </Panel>
        )}
      </ContentBox>
    );
  }
}

const ContentBox = styled('div')`
  h5 {
    color: ${p => p.theme.gray3};
    font-size: ${p => p.theme.fontSizeMedium};
    margin-bottom: ${space(1.5)};
  }
`;

export default withOrganization(FilesChanged);
