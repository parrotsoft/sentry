import {browserHistory} from 'react-router';
import React from 'react';

import {Panel, PanelAlert, PanelBody, PanelHeader} from 'sentry/components/panels';
import {
  addErrorMessage,
  addLoadingMessage,
  clearIndicators,
} from 'sentry/actionCreators/indicator';
import {t} from 'sentry/locale';
import AsyncComponent from 'sentry/components/asyncComponent';
import AsyncView from 'sentry/views/asyncView';
import Button from 'sentry/components/button';
import EmptyMessage from 'sentry/views/settings/components/emptyMessage';
import ErrorBoundary from 'sentry/components/errorBoundary';
import Field from 'sentry/views/settings/components/forms/field';
import ServiceHookSettingsForm from 'sentry/views/settings/project/serviceHookSettingsForm';
import SettingsPageHeader from 'sentry/views/settings/components/settingsPageHeader';
import StackedBarChart from 'sentry/components/stackedBarChart';
import TextCopyInput from 'sentry/views/settings/components/forms/textCopyInput';
import getDynamicText from 'sentry/utils/getDynamicText';

class HookStats extends AsyncComponent {
  getEndpoints() {
    const until = Math.floor(new Date().getTime() / 1000);
    const since = until - 3600 * 24 * 30;
    const {hookId, orgId, projectId} = this.props.params;
    return [
      [
        'stats',
        `/projects/${orgId}/${projectId}/hooks/${hookId}/stats/`,
        {
          query: {
            since,
            until,
            resolution: '1d',
          },
        },
      ],
    ];
  }

  renderTooltip(point, _pointIdx, chart) {
    const timeLabel = chart.getTimeLabel(point);
    const [total] = point.y;

    const value = `${total.toLocaleString()} events`;

    return (
      <div style={{width: '150px'}}>
        <div className="time-label">{timeLabel}</div>
        <div className="value-label">{value}</div>
      </div>
    );
  }

  renderBody() {
    let emptyStats = true;
    const stats = this.state.stats.map(p => {
      if (p.total) {
        emptyStats = false;
      }
      return {
        x: p.ts,
        y: [p.total],
      };
    });

    return (
      <Panel>
        <PanelHeader>{t('Events in the last 30 days (by day)')}</PanelHeader>
        <PanelBody>
          {!emptyStats ? (
            <StackedBarChart
              points={stats}
              height={150}
              label="events"
              barClasses={['total']}
              className="standard-barchart"
              style={{border: 'none'}}
              tooltip={this.renderTooltip}
            />
          ) : (
            <EmptyMessage
              title={t('Nothing recorded in the last 30 days.')}
              description={t('Total webhooks fired for this configuration.')}
            />
          )}
        </PanelBody>
      </Panel>
    );
  }
}

export default class ProjectServiceHookDetails extends AsyncView {
  getEndpoints() {
    const {orgId, projectId, hookId} = this.props.params;
    return [['hook', `/projects/${orgId}/${projectId}/hooks/${hookId}/`]];
  }

  onDelete = () => {
    const {orgId, projectId, hookId} = this.props.params;
    addLoadingMessage(t('Saving changes..'));
    this.api.request(`/projects/${orgId}/${projectId}/hooks/${hookId}/`, {
      method: 'DELETE',
      success: () => {
        clearIndicators();
        browserHistory.push(`/settings/${orgId}/projects/${projectId}/hooks/`);
      },
      error: () => {
        addErrorMessage(t('Unable to remove application. Please try again.'));
      },
    });
  };

  renderBody() {
    const {orgId, projectId, hookId} = this.props.params;
    const {hook} = this.state;
    return (
      <div>
        <SettingsPageHeader title={t('Service Hook Details')} />

        <ErrorBoundary>
          <HookStats params={this.props.params} />
        </ErrorBoundary>

        <ServiceHookSettingsForm
          {...this.props}
          orgId={orgId}
          projectId={projectId}
          hookId={hookId}
          initialData={{
            ...hook,
            isActive: hook.status !== 'disabled',
          }}
        />
        <Panel>
          <PanelHeader>{t('Event Validation')}</PanelHeader>
          <PanelBody>
            <PanelAlert type="info" icon="icon-circle-exclamation">
              Sentry will send the <code>X-ServiceHook-Signature</code> header built using{' '}
              <code>HMAC(SHA256, [secret], [payload])</code>. You should always verify
              this signature before trusting the information provided in the webhook.
            </PanelAlert>
            <Field
              label={t('Secret')}
              flexibleControlStateSize
              inline={false}
              help={t('The shared secret used for generating event HMAC signatures.')}
            >
              <TextCopyInput>
                {getDynamicText({
                  value: hook.secret,
                  fixed: 'a dynamic secret value',
                })}
              </TextCopyInput>
            </Field>
          </PanelBody>
        </Panel>
        <Panel>
          <PanelHeader>{t('Delete Hook')}</PanelHeader>
          <PanelBody>
            <Field
              label={t('Delete Hook')}
              help={t('Removing this hook is immediate and permanent.')}
            >
              <div>
                <Button priority="danger" onClick={this.onDelete}>
                  Delete Hook
                </Button>
              </div>
            </Field>
          </PanelBody>
        </Panel>
      </div>
    );
  }
}
