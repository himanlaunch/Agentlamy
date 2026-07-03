# Getting Started

Get started with the ExampleDocs API in minutes. Install the SDK, authenticate, and make your first API call.

## Installation

Install the Python SDK using pip:

```bash
pip install exampledocs
```

## Authentication

Create a client with your API token:

```python
from exampledocs import Client

client = Client(api_key="YOUR_TOKEN")
```

## Your First Request

### List Users

Retrieve all users in your organization:

```python
users = client.users.list()
for user in users:
    print(user.email)
```

### Handle Errors

The SDK raises typed exceptions:

```python
from exampledocs.errors import NotFoundError

try:
    user = client.users.get("invalid-id")
except NotFoundError:
    print("User not found")
```

## Next Steps

- [Users API Reference](/docs/api/users.html)
- [View as HTML](/docs/getting-started.html)
