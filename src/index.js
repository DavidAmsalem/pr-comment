/**
 * The entrypoint for the action.
 */
const core = require('@actions/core')
const github = require('@actions/github')

async function run() {
  try {
    const owner = core.getInput('owner', { required: true })
    const repo = core.getInput('repo', { required: true })
    const pr_number = core.getInput('pr_number', { required: true })
    const token = core.getInput('token', { required: true })

    const octokit = new github.getOctokit(token)

    const { data: changeFiles } = await octokit.rest.pull.listFiles({
      owner,
      repo,
      pull_number: pr_number
    })

    let diffData = {
      additions: 0,
      deletions: 0,
      changes: 0
    }

    diffData = changeFiles.reduce((acc, file) => {
      acc.additions += file.additions
      acc.deletions += file.deletions
      acc.changes += file.changes
      return acc
    }, diffData)

    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: pr_number,
      body: `
                Pull request #${pr_number} has been updated with: \n
                - ${diffData.changes} changes \n
                - ${diffData.additions} additions \n
                - ${diffData.deletions} deletions
            `
    })

    const lables = []
    for (const file of changeFiles) {
      const fileExtension = file.filename.split('.').pop()
      let label = ''
      switch (fileExtension) {
        case 'md':
          label = 'markdown'
          break
        case 'js':
          label = 'javascript'
          break
        case 'yml':
        case 'yaml':
          label = 'yaml'
          break
        default:
          label = 'noextension'
          break
      }
      lables.push(label)
    }

    // Remove duplicate labels, if any
    const uniqueLabels = [...new Set(lables)]

    // Make a single API call to add all labels to the issue
    await octokit.rest.issues.addLabels({
      owner,
      issue_number: pr_number,
      labels: uniqueLabels
    })
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
