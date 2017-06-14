MAIN_BRANCH = 'master'
IS_MASTER_BUILD = (env.BRANCH_NAME == MAIN_BRANCH)

node(label: 'Small') {
  withDockerRegistry(registry: [credentialsId: 'docker-hub', url: 'https://index.docker.io/v1/']) {
    docker.image('vingle/lambda-microservice-template').pull()
    withDockerContainer([image: 'vingle/lambda-microservice-template']) {
      stage('Checkout SCM') {
        checkout scm
      }

      stage('Check Dependencies') {
        sh 'npm install --cache=./.npm --quiet'
      }

      stage('Test') {
        sh 'npm run test'
      }

      if (IS_MASTER_BUILD) {
        withCredentials([
          [
            $class: 'AmazonWebServicesCredentialsBinding',
            credentialsId: 'jenkins iam',
            accessKeyVariable: 'AWS_ACCESS_KEY_ID',
            secretKeyVariable: 'AWS_SECRET_ACCESS_KEY'
          ]
        ]) {
          env.AWS_DEFAULT_REGION = 'us-east-1'
          stage('deploy:stage') {
            sh 'npm run deploy -- --stage=stage --region=ap-northeast-2'
            sh 'npm run deploy -- --stage=stage'
          }

          stage('deploy:prod') {
            sh 'npm run deploy -- --stage=prod --region=ap-northeast-2'
            sh 'npm run deploy -- --stage=prod'
          }
        }
      }
    }
  }
}
