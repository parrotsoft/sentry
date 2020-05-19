import PropTypes from 'prop-types';
import React from 'react';
import styled from '@emotion/styled';

import {Panel, PanelHeader, PanelBody, PanelItem} from 'sentry/components/panels';
import {addErrorMessage, addSuccessMessage} from 'sentry/actionCreators/indicator';
import {sortProjects} from 'sentry/utils';
import {t} from 'sentry/locale';
import Button from 'sentry/components/button';
import DropdownAutoComplete from 'sentry/components/dropdownAutoComplete';
import DropdownButton from 'sentry/components/dropdownButton';
import EmptyMessage from 'sentry/views/settings/components/emptyMessage';
import InlineSvg from 'sentry/components/inlineSvg';
import LoadingError from 'sentry/components/loadingError';
import LoadingIndicator from 'sentry/components/loadingIndicator';
import Pagination from 'sentry/components/pagination';
import ProjectActions from 'sentry/actions/projectActions';
import ProjectListItem from 'sentry/views/settings/components/settingsProjectItem';
import SentryTypes from 'sentry/sentryTypes';
import Tooltip from 'sentry/components/tooltip';
import space from 'sentry/styles/space';
import withApi from 'sentry/utils/withApi';
import withOrganization from 'sentry/utils/withOrganization';

class TeamProjects extends React.Component {
  static propTypes = {
    api: PropTypes.object.isRequired,
    organization: SentryTypes.Organization.isRequired,
  };

  state = {
    error: false,
    loading: true,
    pageLinks: null,
    unlinkedProjects: [],
    linkedProjects: [],
  };

  componentDidMount() {
    this.fetchAll();
  }

  componentDidUpdate(prevProps) {
    if (
      prevProps.params.orgId !== this.props.params.orgId ||
      prevProps.params.teamId !== this.props.params.teamId
    ) {
      this.fetchAll();
    }

    if (prevProps.location !== this.props.location) {
      this.fetchTeamProjects();
    }
  }

  fetchAll = () => {
    this.fetchTeamProjects();
    this.fetchUnlinkedProjects();
  };

  fetchTeamProjects = () => {
    const {
      location,
      params: {orgId, teamId},
    } = this.props;

    this.setState({loading: true});

    this.props.api
      .requestPromise(`/organizations/${orgId}/projects/`, {
        query: {
          query: `team:${teamId}`,
          cursor: location.query.cursor || '',
        },
        includeAllArgs: true,
      })
      .then(([linkedProjects, _, jqXHR]) => {
        this.setState({
          loading: false,
          error: false,
          linkedProjects,
          pageLinks: jqXHR.getResponseHeader('Link'),
        });
      })
      .catch(() => {
        this.setState({loading: false, error: true});
      });
  };

  fetchUnlinkedProjects = query => {
    const {
      params: {orgId, teamId},
    } = this.props;

    this.props.api
      .requestPromise(`/organizations/${orgId}/projects/`, {
        query: {
          query: query ? `!team:${teamId} ${query}` : `!team:${teamId}`,
        },
      })
      .then(unlinkedProjects => {
        this.setState({unlinkedProjects});
      });
  };

  handleLinkProject = (project, action) => {
    const {orgId, teamId} = this.props.params;
    this.props.api.request(`/projects/${orgId}/${project.slug}/teams/${teamId}/`, {
      method: action === 'add' ? 'POST' : 'DELETE',
      success: resp => {
        this.fetchAll();
        ProjectActions.updateSuccess(resp);
        addSuccessMessage(
          action === 'add'
            ? t('Successfully added project to team.')
            : t('Successfully removed project from team')
        );
      },
      error: () => {
        addErrorMessage(t("Wasn't able to change project association."));
      },
    });
  };

  handleProjectSelected = selection => {
    const project = this.state.unlinkedProjects.find(p => p.id === selection.value);

    this.handleLinkProject(project, 'add');
  };

  handleQueryUpdate = evt => {
    this.fetchUnlinkedProjects(evt.target.value);
  };

  projectPanelContents(projects) {
    const {organization} = this.props;
    const access = new Set(organization.access);
    const canWrite = access.has('org:write');

    return projects.length ? (
      sortProjects(projects).map(project => (
        <StyledPanelItem key={project.id}>
          <ProjectListItem project={project} organization={organization} />
          <Tooltip
            disabled={canWrite}
            title={t('You do not have enough permission to change project association.')}
          >
            <Button
              size="small"
              disabled={!canWrite}
              onClick={() => {
                this.handleLinkProject(project, 'remove');
              }}
            >
              <RemoveIcon /> {t('Remove')}
            </Button>
          </Tooltip>
        </StyledPanelItem>
      ))
    ) : (
      <EmptyMessage size="large" icon="icon-circle-exclamation">
        {t("This team doesn't have access to any projects.")}
      </EmptyMessage>
    );
  }

  render() {
    const {linkedProjects, unlinkedProjects, error, loading} = this.state;

    if (error) {
      return <LoadingError onRetry={() => this.fetchAll()} />;
    }

    if (loading) {
      return <LoadingIndicator />;
    }

    const access = new Set(this.props.organization.access);

    const otherProjects = unlinkedProjects.map(p => ({
      value: p.id,
      searchKey: p.slug,
      label: <ProjectListElement>{p.slug}</ProjectListElement>,
    }));

    return (
      <React.Fragment>
        <Panel>
          <PanelHeader hasButtons>
            <div>{t('Projects')}</div>
            <div style={{textTransform: 'none'}}>
              {!access.has('org:write') ? (
                <DropdownButton
                  disabled
                  title={t('You do not have enough permission to associate a project.')}
                  size="xsmall"
                >
                  {t('Add Project')}
                </DropdownButton>
              ) : (
                <DropdownAutoComplete
                  items={otherProjects}
                  onChange={this.handleQueryUpdate}
                  onSelect={this.handleProjectSelected}
                  emptyMessage={t('No projects')}
                >
                  {({isOpen}) => (
                    <DropdownButton isOpen={isOpen} size="xsmall">
                      {t('Add Project')}
                    </DropdownButton>
                  )}
                </DropdownAutoComplete>
              )}
            </div>
          </PanelHeader>
          <PanelBody>{this.projectPanelContents(linkedProjects)}</PanelBody>
        </Panel>
        <Pagination pageLinks={this.state.pageLinks} {...this.props} />
      </React.Fragment>
    );
  }
}

const RemoveIcon = styled(props => (
  <InlineSvg {...props} src="icon-circle-subtract">
    {t('Remove')}
  </InlineSvg>
))`
  min-height: 1.25em;
  min-width: 1.25em;
  margin-right: ${space(1)};
`;

const StyledPanelItem = styled(PanelItem)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${space(2)};
`;

const ProjectListElement = styled('div')`
  padding: ${space(0.25)} 0;
`;

export {TeamProjects};

export default withApi(withOrganization(TeamProjects));
