# Dockerfile for Jekyll site with Ruby 3.1.0 and Bundler 2.4.22
FROM ruby:3.1.0

# Install dependencies
RUN apt-get update -qq && apt-get install -y build-essential libssl-dev libyaml-dev libreadline-dev zlib1g-dev libncurses5-dev libffi-dev libgdbm6 libgdbm-dev libdb-dev nodejs

# Set working directory
WORKDIR /app

# Copy Gemfile and Gemfile.lock
COPY Gemfile Gemfile
COPY Gemfile.lock Gemfile.lock

# Install Bundler compatible with Ruby 3.1.0
RUN gem install bundler -v 2.4.22

# Install gems
RUN bundle install

# Copy the rest of the app
COPY . .

# Expose default Jekyll port
EXPOSE 4000

# Start Jekyll server
CMD ["bundle", "exec", "jekyll", "serve", "--host", "0.0.0.0"]
