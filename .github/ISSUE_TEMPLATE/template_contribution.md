---
name: Template contribution
about: Contribute a new application template
title: '[TEMPLATE] Add support for [Application Name]'
labels: 'template', 'enhancement'
assignees: ''

---

**Application Information**
- **Name**: [e.g. PostgreSQL, Redis, Grafana]
- **Version**: [e.g. 14.0, latest]
- **Official Documentation**: [link to official docs]
- **Docker Hub/Registry**: [link to container registry]

**Template Details**
- **Deployment Method**: 
  - [ ] Helm Chart
  - [ ] Kubernetes Manifests
  - [ ] Both
- **Helm Chart Repository**: [if using Helm]
- **Chart Version**: [if using Helm]

**Configuration Parameters**
List the key configuration parameters your template will support:
- [ ] Replicas
- [ ] Resource limits (CPU/Memory)
- [ ] Storage configuration
- [ ] Network configuration
- [ ] Authentication settings
- [ ] Environment-specific settings
- [ ] Other: ___________

**Use Cases**
Describe the primary use cases for this application:
1. 
2. 
3. 

**Dependencies**
Does this application require any dependencies or have prerequisites?
- [ ] Database (specify type)
- [ ] Message queue
- [ ] Storage
- [ ] Other applications
- [ ] None

**Testing Plan**
How will you test this template?
- [ ] Local Kind cluster testing
- [ ] Multiple environment testing (dev/test/prod)
- [ ] Resource limit testing
- [ ] Upgrade/downgrade testing
- [ ] Integration testing with other apps

**Documentation**
What documentation will you provide?
- [ ] Template README
- [ ] Configuration examples
- [ ] Troubleshooting guide
- [ ] Integration examples

**Additional Information**
- **Estimated effort**: [hours/days]
- **Help needed**: [areas where you might need assistance]
- **Timeline**: [when you plan to complete this]

**Checklist**
Before submitting, ensure you have:
- [ ] Read the [Template Development Guide](../../TEMPLATE_DEVELOPMENT_GUIDE.md)
- [ ] Followed the [Template Standards](../../TEMPLATE_STANDARDS.md)
- [ ] Planned the template structure
- [ ] Identified all required parameters
- [ ] Considered security implications
